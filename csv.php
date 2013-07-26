<?php
error_reporting(0);

$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, "http://habitat.habhub.org/habitat/_design/ept/_list/csv/payload_telemetry/payload_time?include_docs=true&startkey=[%2214f4eb90052b267e43ade2d4bfbfafff%22,1367494880]&endkey=[%2214f4eb90052b267e43ade2d4bfbfafff%22,[]]&fields=sentence_id,time,latitude,longitude,altitude,satellites,temperature_internal,battery,sentence_id,time,latitude,longitude,altitude,satellites,temperature_internal,battery");
curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
$output = curl_exec($curl);
curl_close($curl);

header("Cache-Control: no-cache");
header("Content-Type: text/csv; charset=utf-8");
header("Content-Disposition: attachment; filename=kraken.csv");
//header("Access-Control-Allow-Origin: *");

echo $output;
