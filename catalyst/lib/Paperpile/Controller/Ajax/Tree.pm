package Paperpile::Controller::Ajax::Tree;

use strict;
use warnings;
use parent 'Catalyst::Controller';
use Paperpile::Library::Publication;
use Data::Dumper;
use 5.010;


sub node : Local {
  my ( $self, $c ) = @_;

  my $node = $c->request->params->{node};

  my $tree;

  if ( not defined $c->session->{"tree"} ) {
    $tree = $c->forward('private/get_default_tree');
    $c->session->{"tree"}=$tree;
  }
  else {
    $tree = $c->session->{"tree"};
  }

  my $subtree = $self->_get_subtree( $c, $tree, $node );

  my $data=$self->_get_js_object($subtree);

  $c->stash->{tree} = $data;

  $c->forward('Paperpile::View::JSON::Tree');

}

sub _relative_path {

  my ( $self, $path ) = @_;

  # skip the first 3 levels which are "built in", might change so
  # this might have to be adjusted in the future
  ($path)=$path=~/\/.*?\/.*?\/.*?\/(.*)/;

  $path='/' if not $path;

  return $path;

}

sub new_folder : Local {
  my ( $self, $c ) = @_;

  my $node_id = $c->request->params->{node_id};
  my $parent_id = $c->request->params->{parent_id};
  my $path = $c->request->params->{path};
  my $name = $c->request->params->{name};

  my $tree= $c->session->{"tree"};

  my $sub_tree= $self->_get_subtree($c, $tree, $parent_id );

  my $new = Tree::Simple->new( { text => $name, type => "FOLDER", draggable =>"true",
                                 path=> '/', id => $node_id },  );
  $new->setUID($node_id);

  $sub_tree->addChild($new);

  $c->model('User')->insert_folder($self->_relative_path($path));

  $c->stash->{success} = 'true';
  $c->forward('Paperpile::View::JSON');

}

sub delete_folder : Local {
  my ( $self, $c ) = @_;

  my $node_id = $c->request->params->{node_id};
  my $parent_id = $c->request->params->{parent_id};
  my $path = $c->request->params->{path};
  my $name = $c->request->params->{name};

  $c->model('User')->delete_folder($self->_relative_path($path));

  $c->stash->{success} = 'true';
  $c->forward('Paperpile::View::JSON');

}


sub move_in_folder : Local {
  my ( $self, $c ) = @_;

  my $node_id = $c->request->params->{node_id};
  my $grid_id = $c->request->params->{grid_id};
  my $sha1 = $c->request->params->{sha1};
  my $rowid = $c->request->params->{rowid};
  my $path = $c->request->params->{path};

  my $plugin = $c->session->{"grid_$grid_id"};
  my $pub = $plugin->find_sha1($sha1);
  my $tree= $c->session->{"tree"};

  my $newFolder=$self->_relative_path($path);
  my @folders=();

  @folders=split(/,/,$pub->folders);
  push @folders, $newFolder;

  my %seen = ();
  @folders = grep { ! $seen{$_} ++ } @folders;

  $c->model('User')->update_folders($rowid, join(',',@folders));
  $pub->folders(join(',',@folders));

  $c->stash->{success} = 'true';
  $c->forward('Paperpile::View::JSON');

}





1;

