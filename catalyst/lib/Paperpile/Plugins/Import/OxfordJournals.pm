package Paperpile::Plugins::Import::OxfordJournals;

use Carp;
use Data::Dumper;
use Moose;
use Moose::Util::TypeConstraints;
use HTML::TreeBuilder::XPath;
use 5.010;

use Paperpile::Library::Publication;
use Paperpile::Library::Author;
use Paperpile::Library::Journal;
use Paperpile::Utils;

extends 'Paperpile::Plugins::Import';

sub BUILD {
    my $self = shift;
    $self->plugin_name('OxfordJournals');
}

sub connect {
    my $self = shift;

    return 0;
}

sub page {
    ( my $self, my $offset, my $limit ) = @_;

    my $page = [];

    $self->_save_page_to_hash($page);

    return $page;
}

sub complete_details {

  ( my $self, my $pub ) = @_;

  if ( !$pub->_details_link() ) {
    NetFormatError->throw( error => 'No link provided to get bibliographic detils.' );
  }

  ( my $link = $pub->_details_link() ) =~ s/\.pdf$//;

  my $browser  = Paperpile::Utils->get_browser;
  my $response = $browser->get($link);
  my $content  = $response->content;

  # We parse the HTML via XPath
  my $tree = HTML::TreeBuilder::XPath->new;
  $tree->utf8_mode(1);
  $tree->parse_content($content);

  my (
    $title, $authors, $journal, $year, $month,    $pmid,
    $doi,   $volume,  $issue,   $issn, $abstract, $pages
  );

  my @meta_tags = $tree->findnodes('/html/head/meta[@name="citation_mjid"');
  if ( $#meta_tags == -1 ) {
    NetFormatError->throw( error => 'No meta tag named citation_mjid found.' );
  }

  # Get the bibtex link
  my $id = $meta_tags[0]->attr('content');
  $id =~ s/v\d$//;
  ( my $base_url = $pub->_details_link() ) =~ s/(.*oxfordjournals.org)(.*)/$1/;
  my $bibtex_url = "$base_url/cgi/citmgr?type=bibtex&gca=$id";

  my $bibtex_tmp = $browser->get($bibtex_url);
  my $bibtex     = $bibtex_tmp->content;

  # Create a new Publication object
  my $full_pub = Paperpile::Library::Publication->new();

  # import the information from the BibTeX string
  $full_pub->import_string( $bibtex, 'BIBTEX' );

  # bibtex import deactivates automatic refresh of fields
  # we force it now at this point
  $full_pub->_light(0);
  $full_pub->refresh_fields();
  $full_pub->refresh_authors();

  $full_pub->citekey('');

  # Note that if we change title, authors, and citation also the sha1
  # will change. We have to take care of this.
  my $old_sha1 = $pub->sha1;
  my $new_sha1 = $full_pub->sha1;
  delete( $self->_hash->{$old_sha1} ) if ($old_sha1);
  $self->_hash->{$new_sha1} = $full_pub;

  return $full_pub;
}



1;