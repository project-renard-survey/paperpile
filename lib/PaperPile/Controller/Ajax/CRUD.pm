package PaperPile::Controller::Ajax::CRUD;

use strict;
use warnings;
use parent 'Catalyst::Controller';
use PaperPile::Library::Publication;
use PaperPile::Library::Source::File;
use PaperPile::Library::Source::DB;
use PaperPile::Library::Source::PubMed;
use PaperPile::PDFviewer;
use Data::Dumper;
use MooseX::Timestamp;
use 5.010;

sub insert_entry : Local {
  my ( $self, $c ) = @_;

  my $source_id = $c->request->params->{source_id};
  my $sha1      = $c->request->params->{sha1};
  my $source = $c->session->{"source_$source_id"};

  my $pub = $source->find_sha1($sha1);

  $pub->created(timestamp);
  $pub->times_read(0);
  $pub->last_read(timestamp); ## for the time being

  $c->model('DBI')->create_pub($pub);

  $pub->_imported(1);

  $c->stash->{success} = 'true';
  $c->forward('PaperPile::View::JSON');

}

sub delete_entry : Local {
  my ( $self, $c ) = @_;

  my $source_id = $c->request->params->{source_id};
  my $rowid     = $c->request->params->{rowid};

  my $source = $c->session->{"source_$source_id"};

  $c->model('DBI')->delete_pubs( [$rowid] );

  $c->stash->{success} = 'true';
  $c->forward('PaperPile::View::JSON');

}

sub update_entry : Local {
  my ( $self, $c ) = @_;

  my $source_id = $c->request->params->{source_id};
  my $rowid     = $c->request->params->{rowid};
  my $sha1      = $c->request->params->{sha1};

  # get old data
  my $source = $c->session->{"source_$source_id"};
  my $pub = $source->find_sha1($sha1);
  my $data=$pub->as_hash;

  # apply new values to old entry
  foreach my $field (keys %{$c->request->params}){
    next if $field=~/source_id/;
    $data->{$field}=$c->request->params->{$field};
  }

  my $newPub=PaperPile::Library::Publication->new($data);

  $c->model('DBI')->update_pub($newPub);

  $c->stash->{success} = 'true';
  $c->forward('PaperPile::View::JSON');

}


sub update_notes : Local {
  my ( $self, $c ) = @_;

  my $rowid     = $c->request->params->{rowid};
  my $sha1      = $c->request->params->{sha1};
  my $html      = $c->request->params->{html};


  $c->model('DBI')->update_field($rowid, 'notes', $html);

  $c->stash->{success} = 'true';
  $c->forward('PaperPile::View::JSON');

}

sub update_tags : Local {
  my ( $self, $c ) = @_;

  my $rowid     = $c->request->params->{rowid};
  my $sha1      = $c->request->params->{sha1};
  my $tags      = $c->request->params->{tags};

  $c->model('DBI')->update_tags($rowid, $tags);

  $c->stash->{success} = 'true';
  $c->forward('PaperPile::View::JSON');

}








sub generate_edit_form : Local {
  my ( $self, $c ) = @_;

  my $pub = PaperPile::Library::Publication->new();

  my $pubtype = $c->request->params->{pubtype};

  my %config=PaperPile::Utils::get_config;

  my @output=();

  foreach my $field (split(/\s+/,$config{pubtypes}->{$pubtype}->{all})){
    push @output, {name=>$field, fieldLabel=>$config{fields}->{$field}};
  }

  my $form=[@output];

  $c->stash->{form} = $form;

  $c->forward('PaperPile::View::JSON');

}




sub index : Path : Args(0) {
  my ( $self, $c ) = @_;

  $c->response->body('Matched PaperPile::Controller::Ajax in Ajax.');
}


1;