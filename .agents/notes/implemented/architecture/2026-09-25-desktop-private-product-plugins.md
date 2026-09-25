# Agent Note: Ship private product plugins inside the packaged dsh runtime

Status: implemented

English | [中文](2026-09-25-desktop-private-product-plugins.zh.md)

## Problem

The Threerouter brand (sidebar logo and wordmark) and the image/video generation tool are private packages under `plugins/`: `dsh-plugin-threerouter` and `dsh-image-video`. They are outside the dsh core package set, so the production graph materialized by [runtime preparation](../../../../apps/desktop/scripts/prepare-dsh.ts) does not contain them, and neither did the packaged `app.asar/dsh`.

The desktop profile lists both packages as enabled bundles. On a machine without the development workspace, the Host therefore failed bundle resolution before startup (`dsh: cannot resolve profile bundle "dsh-image-video"`). Installed releases displayed the default DeepSeek brand because the branding plugin never loaded; on development machines the same profile only worked through `node_modules` junctions left over from local development.

## Decision

Private product plugins are part of the released runtime, not profile-installed external plugins. The packaging build runs the new root `build:plugins` script, which builds each plugin through its package-local tsdown config, after the standard `build:official` step.

[Runtime preparation](../../../../apps/desktop/scripts/prepare-dsh.ts) calls `materializePrivatePlugins` ([private-plugins.ts](../../../../apps/desktop/src/private-plugins.ts)), which verifies every plugin manifest (package name, exact release version, built host and client entries, `cordis.patch.yml`) and copies `package.json`, `cordis.patch.yml`, and `lib/` into the prepared `dsh/node_modules/<plugin>` directory before the runtime descriptor seals the file list. It then imports each copied host entry to prove its imports resolve from the packaged dsh family, and the packaged-runtime smoke boots those bundles from the packaged tree. The plugins reach `app.asar/dsh/node_modules` through the existing `dsh/node_modules` asar mapping, so the shipped profile bundles resolve offline without profile dependencies.

This note does not change external plugin handling: user-installed plugins remain profile dependencies owned by the [bundled-runtime decision](2026-09-08-desktop-bundled-runtime-and-external-plugins.md), and profile entries still take precedence over the shipped copies.

## Alternatives considered

**Declare the plugins as profile dependencies.** Profiles already install external plugins as dependencies. These packages are private and unpublished, so no registry can resolve them, and a profile dependency moves installation and linking back into first launch, where the same failure reappears.

**Admit `plugins/*` to the dsh core package set.** [core-package-set.ts](../../../../apps/desktop/src/core-package-set.ts) owns the first-party package closure rooted at `@deepseek-ai/dsh` and `@deepseek-ai/dsh-desktop-host` as a signed, version-checked set. Adding product-private packages changes that published dependency graph and the profile install set without buying anything over copying built output.

## Consequences

Installed releases carry the Threerouter brand and image/video tools on machines without the development workspace, and the Host no longer fails resolving the built-in bundles. Profiles created before this change with development junctions keep working; deleting `$DSH_HOME/profiles/desktop` reproduces a clean first launch.

The [Desktop README](../../../../apps/desktop/README.md) records the packaging row. Focused tests cover the copy, manifest validation, unbuilt-entry rejection, rematerialization, and host-import verification. Adding another private product plugin means listing it in `PRIVATE_PLUGIN_NAMES` with its version aligned to the release.
