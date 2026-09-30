/**
 * Derive the code-signing identifier of one runtime file.
 * @param appId - Release application identifier.
 * @param path - Slash-separated path inside the runtime tree.
 * @returns Identifier shared with the Developer ID signer for the same path.
 */
export declare function machOIdentifier(appId: string, path: string): string

/**
 * Select the entitlements plist one runtime file needs.
 * @param path - Slash-separated path inside the runtime tree.
 * @param arch - Target architecture; the x64 Node build needs its own entitlement set.
 * @param directory - Directory holding the plist files.
 * @returns Absolute plist path, or undefined for an executable that generates no code.
 */
export declare function runtimeEntitlements(path: string, arch: 'arm64' | 'x64', directory: string): string | undefined

/**
 * Build the arguments that replace one file's signature with an ad-hoc one.
 * @param identifier - Code-signing identifier from {@link machOIdentifier}.
 * @param entitlements - Entitlements plist from {@link runtimeEntitlements}, if any.
 * @param path - Mach-O file to sign.
 * @returns Arguments for `/usr/bin/codesign`.
 */
export declare function adHocSignArguments(identifier: string, entitlements: string | undefined, path: string): string[]

/**
 * Build the arguments that verify one ad-hoc signature.
 * @param path - Signed file to verify.
 * @returns Arguments for `/usr/bin/codesign`.
 */
export declare function adHocVerifyArguments(path: string): string[]

/**
 * Sign every Mach-O file in one runtime tree with an ad-hoc signature and verify each result.
 * @param root - Self-contained runtime directory without symlinks.
 * @param appId - Release application identifier.
 * @param arch - Target runtime architecture, independent of the signing host.
 * @returns Number of signed Mach-O files.
 */
export declare function signMacOSRuntimeAdHoc(root: string, appId: string, arch: 'arm64' | 'x64'): Promise<number>
