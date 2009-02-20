use strict;
use warnings;
use Data::Dumper;
use Test::More 'no_plan';
use lib "../lib";
use PaperPile::Library::Source::File;
use PaperPile::Model::DB;


BEGIN { use_ok 'PaperPile::Library::Source::DB' }

#my $fileSource=PaperPile::Library::Source::File->new(file=>'data/test1.ris');
#$fileSource->connect;

#my $model = PaperPile::Model::DB->new;

#$model->empty_all();

#foreach my $pub (@{$fileSource->all}){
#  $model->create_pub($pub);
#}

my $dbSource=PaperPile::Library::Source::DB->new(query => 'telomerase');
$dbSource->connect;


#my $all=$dbSource->all;
#is (scalar(@$all),67,'Loading entries via all');

$dbSource->entries_per_page(10);

my $page1=$dbSource->page(1);

print Dumper($page1);

#my $page1_manual=[@{$all}[0..9]];
#is (scalar(@{$page1}), 10, "Getting first page. Checking number.");
#is_deeply ($page1, $page1_manual, "Getting first page. Checking content.");



