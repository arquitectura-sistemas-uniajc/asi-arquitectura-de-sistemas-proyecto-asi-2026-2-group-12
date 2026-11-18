#!/bin/bash
# Datos de usuario (user data) de la instancia EC2. Se ejecuta una sola vez, como root,
# en el primer arranque: instala Docker Engine con el complemento compose.
set -e
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu
systemctl enable --now docker
