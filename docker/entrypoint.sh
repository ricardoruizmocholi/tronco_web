#!/bin/sh
# Garantiza que www-data pueda escribir en storage aunque el volumen
# haya sido tocado por root (p.ej. artisan tinker o comandos manuales).
chmod -R 777 /var/www/html/storage 2>/dev/null || true

exec php-fpm
