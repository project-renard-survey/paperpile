
# Copyright 2009-2011 Paperpile
#
# This file is part of Paperpile
#
# Paperpile is free software: you can redistribute it and/or modify it
# under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.

# Paperpile is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# Affero General Public License for more details.  You should have
# received a copy of the GNU Affero General Public License along with
# Paperpile.  If not, see http://www.gnu.org/licenses.

package Paperpile::Job;

use Mouse;
use Mouse::Util::TypeConstraints;

use Paperpile;
use Paperpile::Utils;
use Paperpile::Exceptions;
use Paperpile::Queue;
use Paperpile::Library::Publication;
use Paperpile::PdfCrawler;
use Paperpile::PdfExtract;

use Data::Dumper;
use File::Path;
use File::Spec;
use File::Spec::Functions qw(splitpath);

use File::Copy;
use File::stat;
use FreezeThaw;

use Storable qw(lock_store lock_retrieve);

enum 'Types' => (
  'PDF_IMPORT',         # extract metadata from PDF and match agains web resource
  'PDF_SEARCH',         # search PDF online
  'METADATA_UPDATE',    # Update the metadata for a given reference.
  'WEB_IMPORT',         # Import a reference that was sent from the browser
  'TEST_JOB1',
  'TEST_JOB2',
  'TEST_JOB3',
  'TEST_JOB4',
);

enum 'Status' => (
  'PENDING',            # job is waiting to be started
  'RUNNING',            # job is running
  'DONE',               # job is successfully finished.
  'ERROR'               # job finished with an error or was canceled.
);

has 'job_type' => ( is => 'rw', isa => 'Types' );
has 'status'   => ( is => 'rw', isa => 'Status' );

# GUID identifying the job
has 'id' => ( is => 'rw' );

# Process id of forked sub-process or Win32 process
has 'pid' => ( is => 'rw', default => -1 );

# Error message if job failed
has 'error' => ( is => 'rw' );

# The job is queued or not
has 'queued' => ( is => 'rw', isa => 'Int', default => 0 );

# Field to store different job type specific information
has 'info' => ( is => 'rw', isa => 'HashRef', default => sub { {}; } );

# Time (in seconds) that was used to finish a job
has 'start'    => ( is => 'rw', isa => 'Int' );
has 'duration' => ( is => 'rw', isa => 'Int' );

# Publication object
has 'pub' => ( is => 'rw' );

# File name to store the job object
has '_freeze_file' => ( is => 'rw' );

# File name to dump JSON for the frontend
has '_json_file' => ( is => 'rw' );

# rowid in the database table. At the moment only used to re-submit
# jobs at the original position
has '_rowid' => ( is => 'rw', default => undef );

# Used to store the GUIDs of target collections for a job which (if successful) will
# result in a library import.
has '_collection_guids' => ( is => 'rw', isa => 'ArrayRef', default => sub { [] } );

# Used to store LWP user agent object from PDFcrawler which should be
# re-used in the PDF download function of this module (in case there
# were some important cookies set).
has '_browser' => ( is => 'rw', default => '' );

sub BUILD {
  my ( $self, $params ) = @_;

  # if no id is given we create a new job
  if ( !$params->{id} ) {
    $self->id( Paperpile::Utils->generate_guid );

    if ( $params->{job_type} ) {
      $self->job_type( $params->{job_type} );
      $self->info( { msg => $self->noun . " waiting..." } );
    }

    $self->status('PENDING');
    $self->error('');
    $self->duration(0);
    $self->start(0);

    my $job_dir  = File::Spec->catfile( Paperpile::Utils->get_tmp_dir(), 'jobs' );
    my $json_dir = File::Spec->catfile( Paperpile::Utils->get_tmp_dir(), 'json' );

    mkdir $job_dir  if ( !-e $job_dir );
    mkdir $json_dir if ( !-e $json_dir );

    $self->_freeze_file( File::Spec->catfile( $job_dir, $self->id ) );

    $self->_json_file( File::Spec->catfile( $json_dir, "job-" . $self->id . ".json" ) );

    $self->save;
  }

  # otherwise restore object from disk
  else {
    $self->_freeze_file(
      File::Spec->catfile( Paperpile::Utils->get_tmp_dir(), 'jobs', $self->id ) );
    $self->restore;
    if ( $self->pub ) {
      $self->pub->refresh_job_fields($self);
    }
  }
}

sub noun {
  my $self = shift;

  my $type = $self->job_type;
  return 'PDF download'  if ( $type eq 'PDF_SEARCH' );
  return 'PDF import'    if ( $type eq 'PDF_IMPORT' );
  return 'Auto-complete' if ( $type eq 'METADATA_UPDATE' );
  return 'Test job' if ( $type =~ /TEST_JOB/ );
}

## Save job object to disk

sub save {
  my $self = shift;
  my $file = $self->_freeze_file;
  lock_store( $self, $self->_freeze_file );

  $self->_save_json;

}

## Read job object from disk

sub restore {
  my $self = shift;

  my $stored = undef;

  eval { $stored = lock_retrieve( $self->_freeze_file ); };

  return if not $stored;

  foreach my $key ( $self->meta->get_attribute_list ) {
    $self->$key( $stored->$key );
  }
}

## Updates status in job file and queue database table

sub update_status {
  my ( $self, $status ) = @_;

  $self->status($status);

  if ( $self->queued ) {

    my $dbh = Paperpile::Utils->get_model("Queue")->dbh;

    my $job_id = $dbh->quote( $self->id );

    $dbh->do('BEGIN EXCLUSIVE TRANSACTION');

    $status = $dbh->quote( $self->status );

    my $duration = $self->duration;

    $dbh->do("UPDATE Queue SET status=$status, duration=$duration WHERE jobid=$job_id");

    $dbh->commit;
  }

  $self->save;

}

## Updates field 'key' with value 'value' in the info hash. Both the
## current instance and the saved information on disk are updated.

sub update_info {

  my ( $self, $key, $value ) = @_;

  my $stored = lock_retrieve( $self->_freeze_file );

  $stored->{info}->{$key} = $value;

  lock_store( $stored, $self->_freeze_file );

  $self->{info}->{$key} = $value;

  $self->_save_json;


}

# Deletes job
sub remove {
  my $self = shift;

  if ( $self->queued ) {
    my $dbh = Paperpile::Utils->get_model("Queue")->dbh;
    my $id  = $self->id;
    $dbh->do("DELETE FROM Queue WHERE jobid='$id';");
  }

  unlink $self->_freeze_file;
  unlink($self->_json_file);

}


# Stops a running or pending process. Status is set to ERROR and
# message is set to "... canceled"
sub cancel {
  my $self = shift;

  return if ( $self->status ~~ [ 'ERROR', 'DONE' ] );

  if ( $self->status eq 'RUNNING' ) {

    my $pid = $self->pid;

    if ( $pid != -1 ) {
      if ( $^O eq 'MSWin32' ) {
        require Paperpile::Job::Win32;
        Paperpile::Job::Win32::kill($pid);
        Paperpile->log("KILLING: $pid");
      } else {
        my $processInfo = `ps -A |grep $pid`;
        # Paranoia check to make sure the process is indeed a perl process
        if ( !( $processInfo =~ /perl/ ) ) {
          die("Cancel would have killed $processInfo. Aborted");
        }
        Paperpile->log("KILLING: $processInfo");
        kill( 9, $pid );
      }
    }

    UserCancel->throw( error => $self->noun . ' canceled.' );

  } else {
    $self->error( $self->noun . ' canceled.' );
    $self->update_status('ERROR');
  }

  $self->save;
}


# Resets all fields to prepares a job for a retry
sub reset {
  my $self = shift;

  if ( $self->status eq 'RUNNING' ) {
    $self->cancel;
  }

  $self->update_status('PENDING');
  $self->error('');
  $self->info( { msg => '' } );
  $self->save;
}



## Runs the job in a forked sub-process

sub run {

  my $self = shift;

  my $pid = undef;

  if ( $^O eq 'MSWin32' ) {

    require Paperpile::Job::Win32;

    Paperpile::Job::Win32::run($self->id);


  } else {

    # fork returned undef, indicating that it failed
    if ( !defined( $pid = fork() ) ) {
      die "Cannot fork: $!";
    }

    # fork returned 0, so this branch is child
    elsif ( $pid == 0 ) {

      $self->pid($$);

      close(STDOUT);

      my $start_time = time;
      $self->start($start_time);

      $self->update_status('RUNNING');

      eval { $self->_do_work; };

      my $end_time = time;

      # Make sure that each job takes at least 1 second to be sent once
      # as "running" to frontend which is necessary to get updated
      # correctly. Clearly not optimal but works for now...
      #if ( $self->queued && ( $end_time - $start_time <= 1 ) ) {
      #  sleep(1);
      #}

      $self->pid(-1);

      if ($@) {
        $self->_catch_error;
      } else {
        $self->duration( $end_time - $start_time );
        $self->update_status('DONE');
      }

      if ( $self->queued ) {
        my $q = Paperpile::Queue->new();
        $q->run;
      }

      exit();
    }
  }
}

# Calls the appropriate sequence of tasks for the different job
# types. All the functions that are called here work on the $self->pub
# object and sequentially update its contents until the job is
# done. All errors during this process throw exceptions that are
# caught centrally in the 'run' function above.

sub _do_work {

  my $self = shift;

  if ( $self->pub ) {
    $self->pub->_jobid( $self->id );
  }

  if ( $self->job_type eq 'PDF_SEARCH' ) {

    print STDERR "[queue] Searching PDF for ", $self->pub->_citation_display, "\n";

    if ( $self->pub->pdf ) {
      $self->update_info( 'msg',
        "There is already a PDF for this reference (" . $self->pub->pdf_name . ")." );
      return;
    }

    if ( $self->pub->best_link eq '' ) {

      # Match against online resources and consider only successfull if we get a linkout/doi
      $self->_match(1);

      if ( $self->pub->best_link eq '' ) {
        NetMatchError->throw("Could not find the PDF");
      }
    }

    if ( !$self->pub->_pdf_url ) {
      $self->_crawl;
    }

    $self->_download;

    if ( $self->pub->_imported ) {
      $self->_attach_pdf;
    }

    $self->update_info( 'callback', { fn => 'CONSOLE', args => $self->pub->_pdf_url } );
    $self->update_info( 'msg', 'File successfully downloaded.' );

  }

  if ( $self->job_type eq 'PDF_IMPORT' ) {

    print STDERR "[queue] Start import of PDF ", $self->pub->pdf, "\n";

    # Store the original PDF filename.
    my $orig_pdf_file = $self->pub->pdf;

    $self->_lookup_pdf;

    if ( $self->pub->_imported ) {

      $self->update_info( 'msg', "PDF already in database (" . $self->pub->citekey . ")." );

    } else {

      my $error;

      eval { $self->_extract_meta_data; };

      if ($@) {
        my $e = Exception::Class->caught();
        if ( ref $e ) {
          $error = $e->error;
        } else {
          die($@);
        }
      }

      if ( !$error and !$self->pub->{doi} and !$self->pub->{title} ) {
        $error = "Could not find DOI or title in PDF.";
      }

      if ( !$error ) {
        my $success = $self->_match;

        if ( !$success ) {
          $error = "Could not match PDF to an online resource.";
        }
      }

      # If we encountered an error upstream we do not have the full
      # reference info and import it as 'incomplete'
      if ($error) {
        if ( !$self->pub->title ) {
          my ( $volume, $dirs, $base_name ) = splitpath( $self->pub->pdf );
          $base_name =~ s/\.pdf//i;
          $self->pub->title($base_name);
        }
        $self->pub->pubtype('MISC');
        $self->pub->_incomplete(1);
      }

      $self->_insert;

      # If the destination pub doesn't have a PDF, add this one to it. See issue #756.
      if ( $self->pub->_insert_skipped && !$self->pub->pdf ) {
        my $m = Paperpile::Utils->get_model("Library");
        $m->attach_file( $orig_pdf_file, 1, $self->pub );
        $self->update_info( 'msg', "PDF attached to existing reference in library." );
        return;
      }

      $self->update_info( 'callback', { fn => 'updatePubGrid' } );

      if ($error) {
        NetMatchError->throw($error);
      }

      $self->update_info( 'msg', "PDF successfully imported." );

    }
  }

  if ( $self->job_type eq 'METADATA_UPDATE' ) {
    my $pub = $self->pub;

    my $old_hash = $pub->as_hash;

    my $success = $self->_match;

    my $new_hash = $pub->as_hash;
    if ($success) {
      my $m = Paperpile::Utils->get_model("Library");

      # Update the database entry
      $m->update_pub( $pub->guid, $new_hash );

      # Insert and trash a copy of the old publication, for safe-keeping.
      # Need to delete all fields related to PDF storage, since the PDF stays
      # with the updated copy.
      delete $old_hash->{attachments};
      delete $old_hash->{attachments_list};
      delete $old_hash->{guid};
      delete $old_hash->{pdf};
      delete $old_hash->{pdf_name};
      $old_hash->{title} = '[Backup Copy] ' . $old_hash->{title};
      my $old_pub = Paperpile::Library::Publication->new($old_hash);

      $old_pub->create_guid;

      $m->insert_pubs( [$old_pub], 1 );
      $m->trash_pubs( [$old_pub], 'TRASH' );

      $self->update_info( 'msg', "Reference matched to $success and data updated." );
      $self->update_info( 'callback', { fn => 'updatePubGrid' } );
    } else {
      NetMatchError->throw("Could not match to any online resource.");
    }

  }

  if ( $self->job_type eq 'TEST_JOB1' ) {
    $self->update_info( 'msg', 'Step1' );
    sleep(2);
    $self->update_info( 'msg', 'Step2' );
    sleep(2);
    $self->update_info( 'msg', 'Done.' );
    return;
  }

  if ( $self->job_type eq 'TEST_JOB2' ) {
    $self->update_info( 'msg', 'Step1' );
    sleep(2);
    $self->update_info( 'msg', 'Done.' );
    return;
  }

  if ( $self->job_type eq 'TEST_JOB3' ) {
    TestError->throw("Test exception");
    return;
  }

  if ( $self->job_type eq 'TEST_JOB4' ) {
    die("Unknown exception.");
    return;
  }



}

## Set error fields after an exception was thrown

sub _catch_error {

  my $self = shift;

  my $e = Exception::Class->caught();

  if ( ref $e ) {
    if ( Exception::Class->caught('UserCancel') ) {
      $self->error( $self->noun . ' canceled.' );
    } else {
      $self->error( $e->error );
    }
  } else {

    Paperpile->log($@) if $ENV{PLACK_DEBUG};    # log this error also on console
    $self->error("An unexpected error has occured ($@)");
  }

  $self->update_status('ERROR');
  $self->save;

}

## Rethrows an error that was catched by an eval{}

sub _rethrow_error {

  my $self = shift;

  my $e = Exception::Class->caught();

  if ( ref $e ) {
    $e->rethrow;
  } else {
    die($@);
  }
}

sub get_message {
  my $self = shift;

  if ( $self->error ) {
    return $self->error;
  }

  if ( $self->info ) {
    return $self->info->{'msg'};
  }

  return 'Empty message...';
}

## Dumps the job object as hash

sub as_hash {

  my $self = shift;

  my %hash = ();

  foreach my $key ( $self->meta->get_attribute_list ) {
    my $value = $self->$key;

    # Save the entire 'info' hash.
    if ( $key eq 'info' ) {
      $hash{info} = $self->$key;
    }

    next if ref( $self->$key );

    $hash{$key} = $value;
  }

  $hash{message} = $self->get_message;

  if ( defined $self->pub ) {
    $hash{guid}            = $self->pub->guid;
    $hash{citekey}         = $self->pub->citekey;
    $hash{title}           = $self->pub->title;
    $hash{doi}             = $self->pub->doi;
    $hash{linkout}         = $self->pub->linkout;
    $hash{citation}        = $self->pub->_citation_display;
    $hash{year}            = $self->pub->year;
    $hash{journal}         = $self->pub->journal;
    $hash{authors_display} = $self->pub->_authors_display;
    $hash{authors}         = $self->pub->authors;

    # We have to store the original file name, the file name after
    # import and the guid of the imported PDF in various fields. This
    # is kind of a mess but it does not work with less variables
    $hash{pdf_name} = $self->pub->pdf_name;
    $hash{pdf}      = $self->pub->pdf;
    $hash{_pdf_tmp} = $self->pub->_pdf_tmp;

  }
  return {%hash};

}

sub _save_json {

  my $self = shift;

  my $json = JSON->new->utf8->encode( $self->as_hash );

  open(OUT, ">".$self->_json_file) || die("Could not open ".$self->_json_file. "for writing");

  print OUT $json;

  close(OUT);

}

## The functions that do the actual work are following now. They are
## called by _do_work in a modular fashion. They all work on the
## $self->pub object and throw exceptions if something goes wrong.

# Matches the publications against the different plugins given in the
# 'search_seq' user variable. If $require_linkout we only consider a
# match successfull if we got a doi/linkout (for use during PDF
# download)

sub _match {

  my ( $self, $require_linkout ) = @_;


  my $model    = Paperpile::Utils->get_model("Library");
  my $settings = $model->settings;

  my @plugin_list = split( /,/, $settings->{search_seq} );

  die("No search plugins specified.") if not @plugin_list;

  my $success_plugin;

  print STDERR "[queue] Start matching against online resources.\n";

  eval { $success_plugin = $self->pub->auto_complete( [@plugin_list], $require_linkout ); };

  if ( Exception::Class->caught ) {
    $self->_rethrow_error;
  }

  return $success_plugin;
}

## Crawls for the PDF on the publisher site

sub _crawl {

  my $self = shift;

  my $crawler = Paperpile::PdfCrawler->new;
  $crawler->jobid( $self->id );
  $crawler->debug(1);
  $crawler->driver_file( Paperpile->path_to( 'data', 'pdf-crawler.xml' ) );
  $crawler->load_driver();

  my $pdf;

  my $start_url = '';

  if ( $self->pub->best_link ne '' ) {
    $start_url = $self->pub->best_link;
  } else {
    die("No target url for PDF download");
  }

  print STDERR "[queue] Start crawling at $start_url\n";

  $pdf = $crawler->search_file($start_url);

  $self->pub->_pdf_url($pdf) if $pdf;

  # Save LWP user agent with potentially important cookies to be
  # re-used in _download
  $self->_browser( $crawler->browser );

}

## Downloads the PDF

sub _download {

  my $self = shift;

  print STDERR "[queue] Start downloading ", $self->pub->_pdf_url, "\n";

  $self->update_info( 'msg', "Starting PDF download..." );

  my $file =
    File::Spec->catfile( Paperpile::Utils->get_tmp_dir, "download", $self->pub->guid . ".pdf" );

  # In case file already exists remove it
  unlink($file);

  my $ua = $self->_browser || Paperpile::Utils->get_browser();

  my $res = $ua->request(
    HTTP::Request->new( GET => $self->pub->_pdf_url ),
    sub {
      my ( $data, $response, $protocol ) = @_;

      $self->restore;

      if ( not -e $file ) {
        my $length = $response->content_length;

        if ( defined $length ) {
          $self->update_info( 'size', $length );
        } else {
          $self->update_info( 'size', undef );
        }

        open( FILE, ">$file" )
          or FileWriteError->throw(
          error => "Could not open temporary file for download,  $!.",
          file  => $file
          );
        binmode FILE;
      }

      print FILE $data
        or FileWriteError->throw(
        error => "Could not write data to temporary file,  $!.",
        file  => "$file"
        );
      my $current_size = stat($file)->size;

      $self->update_info( 'downloaded', $current_size );

    }
  );

  # Check if download was successful

  if ( $res->header("X-Died") || !$res->is_success ) {
    unlink($file);
    if ( $res->header("X-Died") ) {
      if ( $res->header("X-Died") =~ /CANCEL/ ) {
        UserCancel->throw( error => $self->noun . ' canceled.' );
      } else {
        if ( $res->code == 403 ) {
          NetGetError->throw(
            'Could not download PDF. Your institution might need a subscription for the journal!');
        } else {
          NetGetError->throw(
            error => 'Download error (' . $res->header("X-Died") . ').',
            code  => $res->code,
          );
        }
      }
    } else {
      if ( $res->code == 403 ) {
        NetGetError->throw(
          'Could not download PDF. Your institution might need a subscription for the journal!');
      } else {
        NetGetError->throw(
          error => 'Download error (' . $res->message . ').',
          code  => $res->code,
        );
      }
    }
  }

  # Check if we have got really a PDF and not a "Access denied" screen
  close(FILE);
  open( FILE, "<$file" ) || die("Could not open downloaded file");
  binmode(FILE);
  my $content;
  read( FILE, $content, 64 );

  if ( $content !~ m/^\%PDF/ ) {
    unlink($file);
    NetGetError->throw(
      'Could not download PDF. Your institution might need a subscription for the journal!');
  }

  # Temporarily set fields. Makes frontend happy in case pub is not imported.
  $self->pub->pdf_name($file);
  $self->pub->pdf($file);

}

## Extracts meta-data from a PDF

sub _extract_meta_data {

  my $self = shift;

  print STDERR "[queue] Extracting meta data for ", $self->pub->pdf, "\n";

  my $bin = Paperpile::Utils->get_binary('pdftoxml');

  my $extract = Paperpile::PdfExtract->new( file => $self->pub->pdf, pdftoxml => $bin );

  my $pub = $extract->parsePDF;

  $pub->pdf( $self->pub->pdf );

  $self->pub($pub);

}

## Look if a PDF file is already in the database

sub _lookup_pdf {

  my $self = shift;

  my $md5 = Paperpile::Utils->calculate_md5( $self->pub->pdf );

  my $pub = Paperpile::Utils->get_model("Library")->lookup_pdf($md5);

  if ($pub) {
    $self->pub($pub);
  }

}

## Inserts the current publication object into the database

sub _insert {

  my $self = shift;

  my $model = Paperpile::Utils->get_model("Library");

  # We here track the PDF file in the pub->pdf field, for import
  # _pdf_tmp needs to be set
  if ( $self->pub->pdf ) {
    $self->pub->_pdf_tmp( $self->pub->pdf );
    $self->pub->pdf('');
  }

  $model->insert_pubs( [ $self->pub ], 1 );

  # Insert into any necessary collections.
  if ( scalar @{ $self->_collection_guids } > 0 ) {
    foreach my $guid ( @{ $self->_collection_guids } ) {
      if ( ( $guid ne '' ) and ( $guid ne 'LOCAL_ROOT' ) ) {
        $model->add_to_collection( [ $self->pub ], $guid );
      }
    }
  }

  $self->pub->_imported(1);
}

## Attaches a PDF file to the database entry of the current
## publication object.

sub _attach_pdf {

  my $self = shift;

  my $file = $self->pub->pdf;

  # Handle deleting of pdf files with new cancel
  #if ( $self->is_canceled ) {
  #  unlink($file);
  #  UserCancel->throw( error => $self->noun . ' canceled.' );
  #}

  my $model = Paperpile::Utils->get_model("Library");

  $model->attach_file( $file, 1, $self->pub );

  unlink($file);

}

1;
