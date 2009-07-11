package Paperpile::Controller::Screens;

use strict;
use warnings;
use Data::Dumper;
use parent 'Catalyst::Controller';


sub patterns : Local {
  my ( $self, $c ) = @_;
  $c->stash->{template} = '/screens/patterns.mas';
  $c->forward('Paperpile::View::Mason');
}

sub settings : Local {
  my ( $self, $c ) = @_;
  $c->stash->{template} = '/screens/settings.mas';
  $c->forward('Paperpile::View::Mason');
}

sub license : Local {
  my ( $self, $c ) = @_;
  $c->stash->{template} = '/screens/license.mas';
  $c->forward('Paperpile::View::Mason');
}

sub credits : Local {
  my ( $self, $c ) = @_;
  $c->stash->{template} = '/screens/credits.mas';
  $c->forward('Paperpile::View::Mason');
}


sub flash_container: Local {

  my ( $self, $c ) = @_;
  $c->stash->{template} = '/screens/flash_container.mas';

  $c->stash->{type} = $c->request->params->{type};
  $c->forward('Paperpile::View::Mason');

}



sub dashboard : Local {
  my ( $self, $c ) = @_;

  my $stats = $c->model('Library')->dashboard_stats;

  $c->stash->{num_items}       = $stats->{num_items};
  $c->stash->{num_pdfs}        = $stats->{num_pdfs};
  $c->stash->{num_attachments} = $stats->{num_attachments};
  $c->stash->{last_imported}   = $stats->{last_imported};

  $c->stash->{template} = '/screens/dashboard.mas';
  $c->forward('Paperpile::View::Mason');
}



1;
