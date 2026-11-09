-- MCP Control Room Seed Data
-- This creates a demo workspace with sample projects and tasks
-- Run after the initial migration

-- Note: This seed data requires a user to exist first
-- In production, this would be run after user registration
-- For demo purposes, we'll create a deterministic demo user

DO $$
DECLARE
    demo_user_id UUID;
    demo_workspace_id UUID;
    project_1_id UUID;
    project_2_id UUID;
    project_3_id UUID;
BEGIN
    -- Create a demo user (in real usage, this comes from Supabase Auth)
    -- This is a fixed UUID for consistent demo data
    demo_user_id := '00000000-0000-0000-0000-000000000001'::uuid;

    -- Create demo workspace
    INSERT INTO workspaces (id, name, owner_id, created_at)
    VALUES (
        '11111111-1111-1111-1111-111111111111'::uuid,
        'Demo Workspace',
        demo_user_id,
        NOW() - INTERVAL '30 days'
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO demo_workspace_id;

    IF demo_workspace_id IS NULL THEN
        SELECT id INTO demo_workspace_id FROM workspaces WHERE name = 'Demo Workspace' LIMIT 1;
    END IF;

    -- Add demo user as owner
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (demo_workspace_id, demo_user_id, 'owner')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    -- Create Project 1: Website Redesign
    INSERT INTO projects (id, workspace_id, name, description, status, created_at, updated_at)
    VALUES (
        '22222222-2222-2222-2222-222222222222'::uuid,
        demo_workspace_id,
        'Website Redesign',
        'Complete redesign of the company website with modern UI/UX',
        'active',
        NOW() - INTERVAL '25 days',
        NOW() - INTERVAL '2 days'
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO project_1_id;

    IF project_1_id IS NULL THEN
        SELECT id INTO project_1_id FROM projects WHERE name = 'Website Redesign' LIMIT 1;
    END IF;

    -- Create Project 2: API Migration
    INSERT INTO projects (id, workspace_id, name, description, status, created_at, updated_at)
    VALUES (
        '33333333-3333-3333-3333-333333333333'::uuid,
        demo_workspace_id,
        'API Migration v2',
        'Migrate legacy REST API to GraphQL with improved performance',
        'active',
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '1 day'
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO project_2_id;

    IF project_2_id IS NULL THEN
        SELECT id INTO project_2_id FROM projects WHERE name = 'API Migration v2' LIMIT 1;
    END IF;

    -- Create Project 3: Mobile App
    INSERT INTO projects (id, workspace_id, name, description, status, created_at, updated_at)
    VALUES (
        '44444444-4444-4444-4444-444444444444'::uuid,
        demo_workspace_id,
        'Mobile App Launch',
        'Build and launch iOS and Android mobile applications',
        'on_hold',
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '5 days'
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO project_3_id;

    IF project_3_id IS NULL THEN
        SELECT id INTO project_3_id FROM projects WHERE name = 'Mobile App Launch' LIMIT 1;
    END IF;

    -- Insert tasks for Project 1: Website Redesign
    INSERT INTO tasks (id, workspace_id, project_id, title, description, status, priority, due_date, created_at, updated_at)
    VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, demo_workspace_id, project_1_id,
     'Design new homepage hero section',
     'Create compelling hero section with clear value proposition and CTA',
     'done', 'high', NOW() + INTERVAL '5 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '2 days'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, demo_workspace_id, project_1_id,
     'Implement responsive navigation',
     'Build mobile-first navigation with hamburger menu and dropdown support',
     'in_progress', 'high', NOW() + INTERVAL '3 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '1 day'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, demo_workspace_id, project_1_id,
     'Create design system components',
     'Build reusable Button, Card, Input, Modal, and Toast components',
     'review', 'medium', NOW() + INTERVAL '7 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '3 days'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, demo_workspace_id, project_1_id,
     'Optimize images and assets',
     'Compress and serve images in WebP format with proper sizing',
     'todo', 'low', NOW() + INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, demo_workspace_id, project_1_id,
     'Set up analytics tracking',
     'Implement GA4 and custom event tracking for key user actions',
     'todo', 'medium', NOW() + INTERVAL '14 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');

    -- Insert tasks for Project 2: API Migration
    INSERT INTO tasks (id, workspace_id, project_id, title, description, status, priority, due_date, created_at, updated_at)
    VALUES
    ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, demo_workspace_id, project_2_id,
     'Design GraphQL schema',
     'Define types, queries, mutations, and subscriptions for all entities',
     'done', 'critical', NOW() + INTERVAL '2 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '5 days'),
    ('11111111-2222-3333-4444-555555555555'::uuid, demo_workspace_id, project_2_id,
     'Implement user authentication resolvers',
     'Build login, register, password reset, and token refresh mutations',
     'in_progress', 'high', NOW() + INTERVAL '5 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days'),
    ('22222222-3333-4444-5555-666666666666'::uuid, demo_workspace_id, project_2_id,
     'Create data loader for N+1 prevention',
     'Implement DataLoader pattern for efficient batch loading',
     'review', 'high', NOW() + INTERVAL '7 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 day'),
    ('33333333-4444-5555-6666-777777777777'::uuid, demo_workspace_id, project_2_id,
     'Add rate limiting and caching',
     'Implement Redis-based caching and rate limiting middleware',
     'todo', 'medium', NOW() + INTERVAL '10 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
    ('44444444-5555-6666-7777-888888888888'::uuid, demo_workspace_id, project_2_id,
     'Write integration tests',
     'Comprehensive test coverage for all GraphQL operations',
     'todo', 'medium', NOW() + INTERVAL '14 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

    -- Insert tasks for Project 3: Mobile App
    INSERT INTO tasks (id, workspace_id, project_id, title, description, status, priority, due_date, created_at, updated_at)
    VALUES
    ('55555555-6666-7777-8888-999999999999'::uuid, demo_workspace_id, project_3_id,
     'Set up React Native project',
     'Initialize Expo project with TypeScript and navigation',
     'done', 'high', NOW() + INTERVAL '1 day', NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days'),
    ('66666666-7777-8888-9999-000000000000'::uuid, demo_workspace_id, project_3_id,
     'Implement authentication flow',
     'Build login, signup, and onboarding screens with secure storage',
     'blocked', 'high', NOW() + INTERVAL '5 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days'),
    ('77777777-8888-9999-0000-111111111111'::uuid, demo_workspace_id, project_3_id,
     'Design push notification system',
     'Plan architecture for local and remote notifications',
     'todo', 'medium', NOW() + INTERVAL '20 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');

    -- Insert default tool permissions for demo workspace
    INSERT INTO tool_permissions (workspace_id, tool_name, permission_category, enabled, requires_approval, allowed_roles)
    VALUES
    (demo_workspace_id, 'list_tasks', 'read', true, false, ARRAY['owner', 'admin', 'member', 'viewer']),
    (demo_workspace_id, 'get_task', 'read', true, false, ARRAY['owner', 'admin', 'member', 'viewer']),
    (demo_workspace_id, 'search_tasks', 'read', true, false, ARRAY['owner', 'admin', 'member', 'viewer']),
    (demo_workspace_id, 'get_project_summary', 'read', true, false, ARRAY['owner', 'admin', 'member', 'viewer']),
    (demo_workspace_id, 'propose_create_task', 'write', true, true, ARRAY['owner', 'admin', 'member']),
    (demo_workspace_id, 'propose_update_task', 'write', true, true, ARRAY['owner', 'admin', 'member'])
    ON CONFLICT (workspace_id, tool_name) DO NOTHING;

END $$;