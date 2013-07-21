<?php
error_reporting(0);

function abort() {
    header("HTTP/1.1 400 Bad Request", true, 400);
    echo "400 - Bad Request";
    exit();
}

if (preg_match('/[^A-Fa-f0-9$]/', $_GET['transmission'])) abort();

$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, "http://habitat.habhub.org/habitat/" . $_GET['transmission']);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
$output = curl_exec($curl);
curl_close($curl);

$data = json_decode($output);

if ($data->type != 'payload_telemetry') abort();
if ($data->data->_parsed->payload_configuration != '14f4eb90052b267e43ade2d4bfbfafff') abort();
if ($data->data->_parsed->configuration_sentence_index != 1) abort();
if (!property_exists($data->receivers, 'kraken')) abort();

$datetime = new DateTime($data->receivers->kraken->time_created);
$datetime = $datetime->format('Y-m-d_H-i-s');
$filename = "kraken-" . $data->data->sentence_id . "-imu-" . $datetime . ".csv";

header("Cache-Control: no-cache");
header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename=' . $filename);

$imu_x = unpack("s50", base64_decode($data->data->imu_x));
$imu_y = unpack("s50", base64_decode($data->data->imu_y));
$imu_z = unpack("s50", base64_decode($data->data->imu_z));

echo "imu_x,imu_y,imu_z\r\n";

for ($i = 1; $i <= 50; $i++) {
    echo ($imu_x[$i]/1000) . "," . ($imu_y[$i]/1000) . "," . ($imu_z[$i]/1000) . "\r\n";
}