#!/usr/bin/perl -w

use lib "../catalyst/lib";
use Paperpile::Model::App;
use Paperpile::Model::Library;
use Data::Dumper;

use YAML qw(LoadFile);

chdir '../catalyst/db';

foreach my $key ('app','user','library'){
  print STDERR "Initializing $key.db...\n";
  unlink "$key.db";
  my @out = `sqlite3 $key.db < $key.sql`;
  print @out;
}

my $model = Paperpile::Model::Library->new();
$model->set_dsn( "dbi:SQLite:" . "library.db" );

my $config = LoadFile('../paperpile.yaml');

foreach my $field ( keys %{$config->{pub_fields}} ) {
  $model->dbh->do("ALTER TABLE Publications ADD COLUMN $field TEXT");
}

# Just for now set some defaults here, will be refactored to set these
# defaults with all other defaults in the Controller
$model->dbh->do("INSERT INTO Tags (tag,style) VALUES ('Important',11);");
$model->dbh->do("INSERT INTO Tags (tag,style) VALUES ('Review',22);");

print STDERR "Importing journal list into app.db...\n";

open( JOURNALS, "<../data/journals.list" );
$model = Paperpile::Model::App->new();
$model->set_dsn( "dbi:SQLite:" . "../db/app.db" );

$model->dbh->begin_work();

my %data=();

foreach my $line (<JOURNALS>) {

  $line =~ s/;.*$//;

  next if $line =~ /^$/;
  next if $line =~ /^\s*#/;

  ( my $long, my $short ) = split( /\s*=\s*/, $line );

  if ($short and $long){
    chomp($short);
    chomp($long);

    # If variants with dots and without exists, we take the on with
    # dots. We have to think about how to get extensive list with dots.
    my $id=$short;
    $id=~s/\.//g;
    $id=~s/ //g;
    if (exists $data{$id}){
      if ($short=~/\./){
        $data{$id}={short=> $short, long => $long};
      }
    } else {
      $data{$id}={short=> $short, long => $long};
    }
  }
}


foreach my $key (sort keys %data){
  my $short=$data{$key}->{short};
  my $long=$data{$key}->{long};

  $short = $model->dbh->quote($short);
  $long  = $model->dbh->quote($long);

  $model->dbh->do("INSERT OR IGNORE INTO Journals (short, long) VALUES ($short, $long);");

  my $rowid = $model->dbh->func('last_insert_rowid');
  print STDERR "$rowid $short $long\n";
  $model->dbh->do("INSERT INTO Journals_lookup (rowid,short,long) VALUES ($rowid,$short,$long)");

}

$model->dbh->commit();

