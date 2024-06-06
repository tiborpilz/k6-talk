#!/usr/bin/env bash

set -e

for VUS in 1 10 20 50 100 200; do
  echo "Running test with $i VUs"
  k6 run --env VUS=$VUS --out influxdb=http://localhost:8086/k6 test.js
  sleep 5
done
