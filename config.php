<?php
error_reporting(0);

$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, "https://raw.github.com/danielsaul/kraken/tracker-config/config.json");
curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
$output = curl_exec($curl);
curl_close($curl);

header("Cache-Control: no-cache");
header("Content-Type: application/json; charset=utf-8");
//header("Access-Control-Allow-Origin: *");

echo $output;
