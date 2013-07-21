<?php
error_reporting(0);

$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, "http://habitat.habhub.org/habitat/_design/payload_telemetry/_view/payload_time?startkey=[%2214f4eb90052b267e43ade2d4bfbfafff%22,1367494880]&endkey=[%2214f4eb90052b267e43ade2d4bfbfafff%22,{}]&include_docs=true");
curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
$output = curl_exec($curl);
curl_close($curl);

header("Cache-Control: no-cache");
header("Content-Type: application/json; charset=utf-8");
//header("Access-Control-Allow-Origin: *");

echo $output;
