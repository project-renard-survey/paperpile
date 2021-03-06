#!/usr/bin/perl -w

use lib "../lib";
use strict;
use Data::Dumper;
use Paperpile::Library::Author;
use Test::More 'no_plan';

BEGIN { use_ok 'Paperpile::Library::Author' }

my $author = Paperpile::Library::Author->new;

my %tests = (
  'bb CC, AA'       => { first => 'AA', von => 'bb',       last => 'CC', jr => '' },
  'bb CC, aa'       => { first => 'aa', von => 'bb',       last => 'CC', jr => '' },
  'bb CC dd EE, AA' => { first => 'AA', von => 'bb CC dd', last => 'EE', jr => '' },
  'bb, AA'          => { first => 'AA', von => '',         last => 'bb', jr => '' },
  'BB,'             => { first => '',   von => '',         last => 'BB', jr => '' },
  'bb CC,XX, AA'    => { first => 'AA', von => 'bb',       last => 'CC', jr => 'XX' },
  'BB,, AA'         => { first => 'AA', von => '',         last => 'BB', jr => '' },
  '{ENCODE consortium}' => { first => '', von => '', last => '{ENCODE consortium}', jr => '' },
);

foreach my $key ( keys %tests ) {

  my $automatic = Paperpile::Library::Author->new;

  $automatic->full($key);

  my $manual = Paperpile::Library::Author->new( $tests{$key} );

  $automatic->full('');
  $manual->full('');

  is_deeply( $automatic, $manual, "Parsing pattern '$key'" );
}

my %initials = (
  ''                  => '',
  'Peter'             => 'P',
  'P'                 => 'P',
  'P.'                => 'P',
  ' Peter '           => 'P',
  'Peter Florian'     => 'PF',
  'Peter F.'          => 'PF',
  'Peter F'           => 'PF',
  'P.F.'              => 'PF',
  'P. F.'             => 'PF',
  '  P.F.  '          => 'PF',
  'P. Florian'        => 'PF',
  'P.Florian'         => 'PF',
  'Peter Florian Max' => 'PFM',
  'P F M'             => 'PFM',
  'P. F. M.'          => 'PFM',
  'P.F.M.'            => 'PFM',
  'Peter FM'          => 'PFM'
);

$author = Paperpile::Library::Author->new;

foreach my $input ( keys %initials ) {
  $author->first($input);
  is( $author->parse_initials(), $initials{$input}, "parse_initials() for $input" );
}

$author = Paperpile::Library::Author->new( full => 'Stadler, Peter F.' );

is( $author->create_key, "STADLER_PF",        "Automatically create key" );
is( $author->nice,       "Stadler PF",        "nice printing" );
is( $author->normalized, "Stadler, PF",       "normalized" );
is( $author->bibtex,     "Stadler, Peter F.", "as bibtex" );
is( $author->bibutils,   "Stadler|Peter|F.", "as bibutils" );

$author = Paperpile::Library::Author->new( full => 'Lawrie, D H' );
is( $author->bibutils,   "Lawrie|D|H", "as bibutils" );

$author = Paperpile::Library::Author->new();

is(
  $author->read_bibutils('Oz|Wizard|V.')->bibtex,
  'Oz, Wizard V.',
  'Reading bibutils authors (Oz|Wizard|V)'
);

is(
  $author->read_bibutils('Phony-Baloney|F.|Phidias')->bibtex,
  'Phony-Baloney, F. Phidias',
  'Reading bibutils authors (Phony-Baloney|F.|Phidias)'
);



