#!/bin/bash
# Loads a menu document into one business with import_menu.
#
#   scripts/menu/load.sh "$(cat .qa-db-url)" "Fish Lips Samford" supabase/seed/fishlips-menu.json
#
# Safe to run again: prices and options are updated, nothing is duplicated or deleted.
# The same file can be loaded from the store app instead: Food → Menu → Import.
set -euo pipefail
db=${1:?database URL}
business=${2:?business name}
file=${3:-supabase/seed/fishlips-menu.json}

psql "$db" -v ON_ERROR_STOP=1 -v business="$business" -v menu="$(cat "$file")" <<'SQL'
select import_menu(
  (select id from businesses where name = :'business'),
  :'menu'::jsonb
) as loaded;
SQL
