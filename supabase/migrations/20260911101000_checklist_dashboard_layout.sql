-- Ensures existing customised dashboards include the new standalone Checklists card.
update public."DashboardCustomizations"
set layout_json = jsonb_set(
  layout_json,
  '{order}',
  (
    select jsonb_agg(item.value order by item.sort_order)
    from (
      select value, ordinality * 10 as sort_order
      from jsonb_array_elements(coalesce(layout_json->'order', '[]'::jsonb)) with ordinality
      union all
      select '"checklists"'::jsonb,
        coalesce((
          select ordinality * 10 + 1
          from jsonb_array_elements(coalesce(layout_json->'order', '[]'::jsonb)) with ordinality
          where value = '"tasks"'::jsonb
          limit 1
        ), 15) as sort_order
    ) as item
  ),
  true
),
updated_at = now()
where not (coalesce(layout_json->'order', '[]'::jsonb) ? 'checklists');


