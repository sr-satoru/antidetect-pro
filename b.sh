#!/bin/bash

cd "/home/vanir/fury/frontend/app" && npm run dev

cd "/home/vanir/fury/frontend/backend" && cargo run

cd "/home/vanir/fury/frontend/vps/server-backend" && npm run start:dev

cd "/home/vanir/fury/frontend/vps/site" && npm run dev