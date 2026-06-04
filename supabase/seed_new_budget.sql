-- Budget ONG — réinitialisation : efface le budget courant + structure, recrée depuis
-- la nouvelle nomenclature de lignes budgétaires fournie.
-- À lancer après les migrations. Transactionnel.

begin;

-- ── 1. Effacement des données budgétaires + structure ────────────────────────
-- Enfants d'abord (contraintes FK). Bailleurs conservés ; allocations GL détachées.
delete from budget_monthly;
delete from budget_line_totals;
delete from bailleur_expense_monthly;
delete from bailleur_income_monthly;
delete from bailleur_line_mapping;
update gl_entries set line_id = null;   -- détache les allocations de l'ancienne structure
delete from budget_years;
delete from budgets;
delete from structure_lines;

-- ── 2. Niveau 1 ──────────────────────────────────────────────────────────────
insert into structure_lines (code, level, label, parent_id, sort_order) values
  ('1', 1, 'Operating Costs',          null, 10),
  ('2', 1, 'Core Initiatives',         null, 20),
  ('3', 1, 'Organisational Development', null, 30),
  ('4', 1, 'Provision',                null, 40);

-- ── 3. Niveau 2 ──────────────────────────────────────────────────────────────
insert into structure_lines (code, level, label, parent_id, sort_order)
select v.code, 2, v.label, p.id, v.sort_order
from (values
  ('1.1', 'Core Team',                                   '1', 10),
  ('1.2', 'Equipment',                                   '1', 20),
  ('1.3', 'General Running Costs',                        '1', 30),
  ('1.4', 'Yaoundé Office - Running Costs',               '1', 40),
  ('2.1', 'Programme Team',                              '2', 10),
  ('2.3', 'Well-Being Pathway',                          '2', 20),
  ('2.4', 'Storytelling Pathway & Café Éc(h)o',          '2', 30),
  ('2.5', 'Visibility Pathway',                          '2', 40),
  ('2.6', 'Mentorship Pathway',                          '2', 50),
  ('2.7', 'Connect - Bridge',                            '2', 60),
  ('2.8', 'Podcast',                                     '2', 70),
  ('3.1', 'Networking : Regional & Global conference / Gathering', '3', 10),
  ('3.2', 'Team Meetings',                               '3', 20),
  ('3.3', 'Governance (Face-to-Face Board Meeting)',     '3', 30),
  ('3.4', 'External Communications',                     '3', 40),
  ('3.5', 'Monitoring, Evaluation  Accountability and Learning (MEAL)', '3', 50),
  ('3.6', 'Organization Development Consultants',        '3', 60),
  ('4.1', 'Provision',                                   '4', 10)
) as v(code, label, parent_code, sort_order)
join structure_lines p on p.code = v.parent_code;

-- ── 4. Niveau 3 ──────────────────────────────────────────────────────────────
insert into structure_lines (code, level, label, parent_id, sort_order)
select v.code, 3, v.label, p.id, v.sort_order
from (values
  -- 1.1 Core Team
  ('1.1.1', 'Executive Director (ED)',                   '1.1', 10),
  ('1.1.2', 'Finance, HR  & Operations Manager',         '1.1', 20),
  ('1.1.3', 'Communications Manager',                    '1.1', 30),
  ('1.1.4', 'Junior Admin & Logistics Assitant',         '1.1', 40),
  -- 1.2 Equipment
  ('1.2.1', 'Computer - Screen - Headphones',            '1.2', 10),
  ('1.2.2', 'Printer',                                   '1.2', 20),
  ('1.2.3', 'Office Furniture',                          '1.2', 30),
  ('1.2.4', 'Internet Equipment',                        '1.2', 40),
  ('1.2.5', 'Power Alternative Equipment + Air Conditionner', '1.2', 50),
  ('1.2.6', 'Kitchen Equipment',                         '1.2', 60),
  ('1.2.7', 'Communications Equipment (high-resolution phone – equipped with a memory card)', '1.2', 70),
  ('1.2.8', 'Conference Room Equipment (Camera, Multi-focus Screen + Speaker)', '1.2', 80),
  -- 1.3 General Running Costs
  ('1.3.1', 'Legal Advice Fee & Recruitment Fee',        '1.3', 10),
  ('1.3.2', 'Bank Charges',                              '1.3', 20),
  ('1.3.3', 'Foreign Exchange Loss',                     '1.3', 30),
  ('1.3.4', 'Admin and Legal Assistance (Rodec Conseil + Interim Assistance)', '1.3', 40),
  ('1.3.5', 'Software Licences',                         '1.3', 50),
  ('1.3.6', 'Digital System - Setup & Maintenance',      '1.3', 60),
  ('1.3.7', 'Audit – Accounting Expertise – Legal Compliance', '1.3', 70),
  ('1.3.8', 'ED Legal Costs (Flight HQ + Work Permit + Visa)', '1.3', 80),
  -- 1.4 Yaoundé Office
  ('1.4.1', 'Office Rent (Including fuel)',              '1.4', 10),
  ('1.4.2', 'Fuel',                                      '1.4', 20),
  ('1.4.3', 'Office Supplies',                           '1.4', 30),
  ('1.4.4', 'Internet',                                  '1.4', 40),
  ('1.4.5', 'Office Insurance',                          '1.4', 50),
  ('1.4.6', 'Legal Registration Fees (in Cameroon)',     '1.4', 60),
  ('1.4.7', 'Officer Cleaner',                           '1.4', 70),
  -- 2.1 Programme Team
  ('2.1.1', 'Well-Being Pathway -  Lead',                '2.1', 10),
  ('2.1.3', 'Engagement Officer',                        '2.1', 20),
  ('2.1.4', 'Programme/MEAL Coordinator',                '2.1', 30),
  -- 2.3 Well-Being Pathway
  ('2.3.2', 'Well-Being Pathway - Co-Facilitator / Coach', '2.3', 10),
  ('2.3.3', 'Retreat - Venue Rental',                    '2.3', 20),
  ('2.3.4', 'Retreat - Local Transport - Participants & Facilitators', '2.3', 30),
  ('2.3.5', 'Retreat - Flight -Visa - Insurance Costs - Participants', '2.3', 40),
  ('2.3.6', 'Retreat - Flight -Visa  - Insurance Costs - Facilitators', '2.3', 50),
  ('2.3.7', 'Retreat - Accommodation - Participants',    '2.3', 60),
  ('2.3.8', 'Retreat - Accommodation - Facilitators',    '2.3', 70),
  ('2.3.9', 'Retreat - Meals - Participants (Breakfast, Lunch, Dinner)', '2.3', 80),
  ('2.3.10', 'Retreat - Meals - Facilitators (Breakfast, Lunch, Dinner)', '2.3', 90),
  ('2.3.11', 'Retreat - Workshop Materials & Resources', '2.3', 100),
  ('2.3.12', 'Retreat - Videographer/Photographer & Comms Materials', '2.3', 110),
  ('2.3.13', 'External Facilitators (Physical Expression Coach, Masterclass Guests)', '2.3', 120),
  -- 2.4 Storytelling Pathway & Café Éc(h)o
  ('2.4.1', 'Storytelling Pathway - Lead Consultant',    '2.4', 10),
  ('2.4.2', 'External Speaker/Expert /facilitator (Café Ec(h)o)', '2.4', 20),
  ('2.4.3', 'Café & Materiel (Café Éc(h)o)',             '2.4', 30),
  ('2.4.4', 'Online Platform (Akademi : Setup & Uploading Content)', '2.4', 40),
  -- 2.5 Visibility Pathway
  ('2.5.1', 'Visibility Pathway - Lead',                 '2.5', 10),
  ('2.5.2', 'Visibility Pathway - Assistant',            '2.5', 20),
  ('2.5.3', 'Local Consultant / Videographer',           '2.5', 30),
  ('2.5.4', 'Field Visit Costs (Accommodation  - Meals - Local Transport)', '2.5', 40),
  ('2.5.5', 'Flights (Including Visa Fees & Travel Insurance)', '2.5', 50),
  ('2.5.6', 'Translation',                               '2.5', 60),
  ('2.5.7', 'Product Development / Dissemination',       '2.5', 70),
  -- 2.6 Mentorship Pathway
  ('2.6.1', 'Content & Resource Development',            '2.6', 10),
  ('2.6.2', 'In person training - retreat',              '2.6', 20),
  ('2.6.3', 'External Trainers / Mentoring Experts (Online Sessions)', '2.6', 30),
  -- 2.7 Connect - Bridge
  ('2.7.1', 'Coordinator - Bridging Initiatives',        '2.7', 10),
  ('2.7.2', 'Intern - Bridging Initiatives',             '2.7', 20),
  -- 2.8 Podcast
  ('2.8.1', 'Communications Officer',                    '2.8', 10),
  ('2.8.2', 'Podcast Editing Software',                  '2.8', 20),
  ('2.8.3', 'Research re. Specific Barriers for IP women (all included : consultants, report design-translation-publication)', '2.8', 30),
  -- 3.1 Networking
  ('3.1.1', 'Flights (including Visa fees & Travel insurance)', '3.1', 10),
  ('3.1.2', 'Accommodation',                             '3.1', 20),
  ('3.1.3', 'Local Transport',                           '3.1', 30),
  ('3.1.4', 'Other Fees',                                '3.1', 40),
  -- 3.2 Team Meetings
  ('3.2.1', 'Flights (including Visa Fees & Travel Insurance)', '3.2', 10),
  ('3.2.2', 'Accommodation & Meals',                     '3.2', 20),
  ('3.2.3', 'Local Transport',                           '3.2', 30),
  ('3.2.5', 'Consultant Fee',                            '3.2', 40),
  -- 3.3 Governance
  ('3.3.1', 'Flights (Including Visa Fees & Travel Insurance)', '3.3', 10),
  ('3.3.2', 'Accommodation & Meals',                     '3.3', 20),
  ('3.3.3', 'Local Transport',                           '3.3', 30),
  -- 3.4 External Communications
  ('3.4.1', 'Illustrations and Graphics',                '3.4', 10),
  ('3.4.2', 'Design - Organisational Documents',         '3.4', 20),
  ('3.4.3', 'Translation & Proofreading',                '3.4', 30),
  ('3.4.4', 'Website Redevelopment - Consulting Fee',    '3.4', 40),
  ('3.4.5', 'Printing - Organisational Documents',       '3.4', 50),
  -- 3.5 MEAL
  ('3.5.1', 'MEAL - System & Software',                  '3.5', 10),
  ('3.5.3', 'External Evaluation',                       '3.5', 20),
  -- 3.6 OD Consultants
  ('3.6.1', 'OD & Strategy Development Expert',          '3.6', 10),
  ('3.6.3', 'Organizational Systems & Skills Expert',    '3.6', 20),
  ('3.6.4', 'Organizational Culture Expert',             '3.6', 30),
  ('3.6.5', 'Gender, Feminism & Environmental Justice Expert', '3.6', 40),
  ('3.6.6', 'MEAL Expert',                               '3.6', 50),
  ('3.6.7', 'Executive Coaching for the Executive Director', '3.6', 60),
  -- 4.1 Provision
  ('4.1.1', 'Provision',                                 '4.1', 10)
) as v(code, label, parent_code, sort_order)
join structure_lines p on p.code = v.parent_code;

-- ── 5. Nouveau budget actif (sans montants ni années pré-remplies) ───────────
insert into budgets (name, type, is_active, initial_cash)
values ('Budget', 'interne', true, 0);

commit;
