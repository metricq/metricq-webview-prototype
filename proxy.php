<?php
$proxy_url_to = 'https://grafana.metricq.zih.tu-dresden.de/metricq/query';

if('POST' === $_SERVER['REQUEST_METHOD'])
{
        $post_data = file_get_contents('php://input');
        $stream_context_options = array(
                'http' => array(
                        'header'   => "Content-Type: appliction/x-www-form-urlencoded\r\n",
                        'method'   => 'POST',
                        'content'  => $post_data
                )
        );
        $context = stream_context_create($stream_context_options);
        $response = file_get_contents($proxy_url_to, false, $context);
        print($response);
} else
{
        print('expected a POST request');
}
?>
