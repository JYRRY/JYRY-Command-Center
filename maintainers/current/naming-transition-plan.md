# JYRY Command Center Naming Transition Plan

This document defines the remaining naming cleanup from the legacy JYRY Command Center identity to JYRY Command Center (`jyry-command-center`).

This remains implementation-ready planning for the remaining compatibility-sensitive cutover work.

## Goal

Move the public identity of the repo to:
- platform name: `jyry-command-center`

While preserving:
- JYRY as a compatibility profile
- existing JYRY runtime wiring during the compatibility window
- existing JYRY CLI alias during the compatibility window

## Naming Layers

The transition must separate these naming layers:

`platform identity`
- the public product and repo identity

`consumer profile identity`
- project-specific compatibility naming such as JYRY

`runtime/package identity`
- package names, binary names, app names, and descriptions

The current problem is that these layers are still collapsed together under JYRY naming.

## Target End State

Public identity:
- repo-facing name: `jyry-command-center`
- root package name: `jyry-command-center`
- MCP package name: `jyry-command-center-mcp`
- primary public CLI name: `jyry-command-center`

Compatibility identity:
- JYRY remains a documented compatibility profile
- `jyry` remains a compatibility CLI alias during the transition window

## Repo Naming Strategy

### Before cutover day

- docs lead with `jyry-command-center`
- package metadata can safely use the public names before filesystem or runtime wiring changes
- JYRY wording is labeled as compatibility language only

### On cutover day

- rename repository-facing references if required by release strategy
- update package metadata and repository links together
- publish compatibility notes in the same release

## Package Naming Strategy

### Root app package

Current:
- `jyry-command-center`

Target:
- `jyry-command-center`

Transition rule:
- package-id cutover is safe once public docs, examples, and validation are in place
- keep the root app package `private` until the desktop distribution story is ready

### MCP package

Current:
- `jyry-command-center-mcp`

Target:
- `jyry-command-center-mcp`

Transition rule:
- package-id cutover is safe while the `jyry` CLI alias remains in place
- keep the live JYRY `.mcp.json` launch path unchanged during the compatibility window

## CLI Naming Strategy

### Primary public CLI

Target:
- `jyry-command-center`

Purpose:
- public OSS install path
- generic external project setup
- platform-facing documentation

### Compatibility CLI alias

Keep:
- `jyry`

Rules:
- remains available during the compatibility window
- documented as a compatibility alias
- must not be removed until public CLI adoption and rollback guidance are ready

## Compatibility Window Policy

During the compatibility window:
- public docs lead with `jyry-command-center`
- package metadata may already use the public names
- `jyry` remains an alias, not the primary identity
- JYRY runtime wiring remains unchanged

The compatibility window ends only when:
- public package names are live
- public CLI is live
- fresh external install validation passes
- JYRY compatibility has an explicit rollback path

## Rename Order

### Stage 1: documentation-first

Safe, additive, no cutover:
- public docs lead with `jyry-command-center`
- JYRY wording is relabeled as compatibility only
- new naming plan is published

### Stage 2: additive public aliases

Safe, additive, before cutover:
- add public CLI alias
- add public package descriptions and docs
- preserve old package and CLI names

### Stage 3: cutover-ready package metadata

Requires coordinated implementation:
- rename package names
- update package descriptions
- update release docs and install instructions
- keep compatibility aliases active

### Stage 4: post-cutover cleanup

Only after the compatibility window:
- retire legacy naming from primary docs
- optionally remove deprecated aliases on a later schedule

## What Must Not Be Renamed Yet

Until cutover day:
- root `package.json` `name`
- `mcp-server/package.json` `name`
- `mcp-server/package.json` `bin.jyry`
- runtime-facing JYRY compatibility wiring
- live JYRY `.mcp.json` expectations

## Required Release Notes For Cutover

The eventual cutover release must explain:
- new public names
- unchanged JYRY compatibility path
- alias support window
- how to keep existing JYRY setups working
- when deprecations are expected to be enforced

## Required Phase 3 Decisions

Phase 3 must settle:
- whether the public CLI name and package rename land in the same release
- whether both binaries are shipped from one MCP package or two
- whether filesystem repo rename is required for OSS publication or can lag package renames
- how long the `jyry` alias remains supported
