# Spec Delta

## MODIFIED Requirements

### Requirement: Preserve surrounding sample frontend
The public homepage SHALL retain its real-group hero, provider animations, category appearance, shared breadcrumbs and group showcase. Header search and catalogue navigation SHALL retain current destinations. Group cards and routes SHALL follow public-group-judgments. `/design-system` SHALL remain a maintained reference for current shared components with isolated fixtures; obsolete alternatives and unreachable sample flows need not remain available.

#### Scenario: Sample hero details
- **WHEN** obsolete homepage fixture branches or an unused hero alternative are retired
- **THEN** the public homepage retains the real-group hero without a sample dialog or fixture fallback, and independently retained design-system examples use their own facts without public detail lookups

#### Scenario: Existing destinations
- **WHEN** the homepage groups and existing group/design-system routes are visited
- **THEN** group cards and destinations use real judged groups and documented legacy redirects, while `/design-system` remains usable as the reference for maintained components with backend-independent examples

#### Scenario: Scoped homepage discovery update
- **WHEN** the homepage is displayed
- **THEN** category cards retain their group-catalogue links, the group section retains up to three cards and its all-groups action, and the individual-course section is a bounded shelf after group discovery

#### Scenario: Real hero preserved
- **WHEN** the featured real group's eligibility or current judgment changes
- **THEN** the existing real-group hero contract determines its display or unavailable state without reintroducing saved sample courses

#### Scenario: Provider animation and section navigation
- **WHEN** a visitor uses the hero at desktop or mobile widths
- **THEN** the desktop provider strip or mobile vertical logo/name wheel retains its current presentation, reduced-motion handling and absence of pause controls or hover pause, and «دیدن مجموعه دوره‌ها» scrolls to homepage `#groups` even when that fragment is already present

#### Scenario: Public course navigation stays independent
- **WHEN** a visitor submits homepage search or activates a public course title or course action
- **THEN** search opens the group catalogue while the course link opens its retained provider URL in a new tab, without reviving fixture filtering or local course-detail dialogs
