package Paperpile::Controller::Ajax::Queue;

use strict;
use warnings;
use parent 'Catalyst::Controller';
use Paperpile::Library::Publication;
use Paperpile::PdfExtract;
use Data::Dumper;
use 5.010;
use File::Find;
use File::Path;
use File::Compare;
use File::Basename;
use File::stat;
use MooseX::Timestamp;
use POSIX qw(ceil floor);

sub grid : Local {

  my ( $self, $c ) = @_;

  my $start = $c->request->params->{start};
  my $limit = $c->request->params->{limit};

  my @data = ();

  my $q = Paperpile::Queue->new();

  #$q->_dump;

  foreach my $job ( @{ $q->jobs } ) {
    push @data, $job->as_hash;

    # For simplicity, simply push info for complete queue to each item
    # in the list
    $data[$#data]->{num_pending}  = $q->num_pending;
    $data[$#data]->{num_done}     = $q->num_done;
    $data[$#data]->{queue_status} = $q->status;
    $data[$#data]->{eta}          = $q->eta;
  }

  my $total_entries = scalar @data;

  my $end = ( $start + $limit - 1 );

  @data = @data[ $start .. ( ( $end > $#data ) ? $#data : $end ) ];

  my %metaData = (
    totalProperty => 'total_entries',
    root          => 'data',
    id            => 'id',
    fields        => [
      'id',    'type',     'status',  'progress',    'error',    'citekey',
      'title', 'citation', 'authors', 'num_pending', 'num_done', 'queue_status',
      'eta'
    ]
  );

  $c->stash->{total_entries} = $total_entries;

  $c->stash->{data}     = [@data];
  $c->stash->{metaData} = {%metaData};
  $c->detach('Paperpile::View::JSON');

}

sub clear :Local {

  my ( $self, $c ) = @_;

  my $q = Paperpile::Queue->new();
  $q->clear;

}

sub pause :Local {

  my ( $self, $c ) = @_;

  my $q = Paperpile::Queue->new();
  $q->pause;
}

sub resume :Local {

  my ( $self, $c ) = @_;

  my $q = Paperpile::Queue->new();
  $q->resume;
}



sub get_running : Local {

  my ( $self, $c ) = @_;

  my $limit = $c->request->params->{limit};

  my $q = Paperpile::Queue->new();

  my @jobs =  @{ $q->jobs };

  my $i = 0;

  my $is_running=0;

  while ($i <= $#jobs){
    print STDERR "$i\n";
    if ($jobs[$i]->status eq 'RUNNING'){
      $is_running=1;
      last;
    }
    $i++;
  }

  my $page = -1;
  my $index = -1;

  if ($is_running){
    $page = floor($i/$limit)+1;
    $index = $i % $limit;
  }

  print STDERR "==========> $i $limit $page $index\n";

  $c->stash->{page} = $page;
  $c->stash->{index} = $index;

}



1;