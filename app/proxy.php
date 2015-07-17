<?php

$cachepath = '/tmp/six_degrees_cache';
$cachettl = 86400;

if (!is_dir($cachepath)) {
	mkdir($cachepath, 0777, true);
}

$filepath = realpath($cachepath.'/'.md5($_GET['url']));

if (is_readable($filepath)) {
	if (filemtime($filepath) < (time() - $cachettl)) {
		unlink($filepath);
	} else {
		header('Content-type: application/json');
		readfile($filepath);
		exit;
	}
}

$data = file_get_contents($_GET['url']);
file_put_contents($filepath, $data);
header('Content-type: application/json');
echo $data;
