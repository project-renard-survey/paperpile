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


package Paperpile::MetaCrawler::Targets::GoogleBooks;
use Mouse;
use Paperpile::Utils;
use HTML::TreeBuilder;
use Paperpile::Library::Author;
use Paperpile::MetaCrawler::Targets::Bibtex;

extends 'Paperpile::MetaCrawler::Targets';

sub convert {

  my ( $self, $content, $url ) = @_;

  my $pub = Paperpile::Library::Publication->new( pubtype => "BOOK" );
  my $authors;
  my $editors;
  my $booktitle;
  my $publisher;
  my $year;
  my $abstract;
  my $isbn;
  my $pages;
  my $linkout_url;

  if ( $url =~ m/(.*&?\??id=)([\w|-]+)(&.*)/ ) {
    my $bibtex_url = "http://books.google.com/books/download/books?id=$2&output=bibtex";
    my $browser    = Paperpile::Utils->get_browser;
    my $response   = $browser->get($bibtex_url);
    my $bibtex     = $response->content();

    # Google likes to double escape stuff
    $bibtex =~ s/\\\\/\\/g;

    # remove citation key
    $bibtex =~ s/(\@[A-Z]+)(\{[^,]+,)(.*)/$1\{dummy,$3/i;

    my $tmp = Paperpile::MetaCrawler::Targets::Bibtex->new();
    $pub = $tmp->convert($bibtex);

    # in case we did not succeed.
    $pub = Paperpile::Library::Publication->new( pubtype => "BOOK" ) if ( ! $pub );
  }

  my $tree = HTML::TreeBuilder->new;
  $tree->utf8_mode(1);
  $tree->parse_content($content);

  my @tags = $tree->look_down(
    '_tag' => 'div',
    'id'   => 'synopsistext'
  );
  if ( $tags[0] ) {
    $abstract = $tags[0]->as_text;
  }

  # if the bibtex parsing did not work we parse the HTML page
  if ( !$pub->title ) {

    my @tags_values = $tree->look_down(
      '_tag'  => 'td',
      'class' => 'metadata_value'
    );
    my @tags_labels = $tree->look_down(
      '_tag'  => 'td',
      'class' => 'metadata_label'
    );

    if ( $#tags_values == $#tags_labels ) {
      foreach my $i ( 0 .. $#tags_values ) {
        my $label = $tags_labels[$i]->as_text();
        my $value = $tags_values[$i]->as_text();
        $booktitle = $value if ( $label eq 'Title' );
        if ( $label eq 'Authors' ) {
          my @tmp = split( /,/, $value );
          my @authors_tmp = ();
          foreach my $e (@tmp) {
            push @authors_tmp, Paperpile::Library::Author->new()->parse_freestyle($e)->bibtex();
          }
          $authors = join( " and ", @authors_tmp );
        }
        if ( $label eq 'Editors' ) {
          my @tmp = split( /,/, $value );
          my @authors_tmp = ();
          foreach my $e (@tmp) {
            push @authors_tmp, Paperpile::Library::Author->new()->parse_freestyle($e)->bibtex();
          }
          $editors = join( " and ", @authors_tmp );
        }
        if ( $label eq 'Publisher' ) {
          if ( $value =~ m/(.*),\s(\d+)/ ) {
            $publisher = $1;
            $year      = $2;
          }
        }
        if ( $label eq 'ISBN' ) {
          if ( $value =~ m/(.*),\s(.*)/ ) {
            $isbn = $1;
          } else {
            $isbn = $value;
          }
        }
        if ( $label eq 'Length' ) {
          if ( $value =~ m/(\d+)\spages/ ) {
            $pages = $1;
          }
        }
      }
    }
  }

  $pub->title($booktitle)     if ($booktitle);
  $pub->authors($authors)     if ($authors);
  $pub->editors($editors)     if ($editors);
  $pub->publisher($publisher) if ($publisher);
  $pub->year($year)           if ($year);
  $pub->isbn($isbn)           if ($isbn);
  $pub->abstract($abstract)   if ($abstract);
  $pub->url($url)             if ($url);
  $pub->linkout($url)         if ($url);
  $pub->pages($pages)         if ($pages);

  return $pub;
}

1;
