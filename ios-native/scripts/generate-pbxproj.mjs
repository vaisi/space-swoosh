// generate-pbxproj.mjs
// Changes: CFBundleVersion 7; pack Voice/SFX mp3s; include new Swift files.
// Run: node scripts/generate-pbxproj.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const appRoot = path.join(root, 'SpaceSwoosh');

function id(seed) {
  return crypto.createHash('md5').update(seed).digest('hex').slice(0, 24).toUpperCase();
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const swiftFiles = walk(appRoot).filter((f) => f.endsWith('.swift'));
const voiceFiles = walk(appRoot).filter((f) => {
  const name = path.basename(f);
  if (name.includes('ElevenLabs')) return false;
  return /^(level-\d+|first-boop|swoosh-voice|background|crash|crash_with_shield|shield|turn)\.(mp3|m4a)$/.test(name);
});
const infoPlist = path.join(appRoot, 'Info.plist');
const privacyPlist = path.join(appRoot, 'PrivacyInfo.xcprivacy');

const projectId = id('project');
const targetId = id('target');
const sourcesPhase = id('sources');
const resourcesPhase = id('resources');
const frameworksPhase = id('frameworks');
const mainGroup = id('mainGroup');
const productsGroup = id('productsGroup');
const appGroup = id('appGroup');
const productRef = id('productRef');
const debugConfig = id('debugConfig');
const releaseConfig = id('releaseConfig');
const projectDebug = id('projectDebug');
const projectRelease = id('projectRelease');
const targetConfigs = id('targetConfigs');
const projectConfigs = id('projectConfigs');

const fileRefs = new Map();
const buildFiles = new Map();

function ensureFile(filePath, hint) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  if (!fileRefs.has(rel)) {
    fileRefs.set(rel, {
      ref: id(`file:${rel}`),
      build: id(`build:${rel}`),
      name: path.basename(filePath),
      rel,
      hint,
    });
  }
  return fileRefs.get(rel);
}

for (const f of swiftFiles) ensureFile(f, 'sourcecode.swift');
for (const f of voiceFiles) {
  ensureFile(f, f.endsWith('.m4a') ? 'file' : 'audio.mp3');
}
ensureFile(infoPlist, 'text.plist.xml');
ensureFile(privacyPlist, 'text.plist.xml');

// Asset catalog as a single resource folder reference
const assetsPath = path.join(appRoot, 'Assets.xcassets');
const assets = {
  ref: id('assets'),
  build: id('assetsBuild'),
  name: 'Assets.xcassets',
  rel: 'SpaceSwoosh/Assets.xcassets',
};

const groups = new Map();
function groupFor(dirRel) {
  if (!groups.has(dirRel)) {
    groups.set(dirRel, { id: id(`group:${dirRel}`), children: [], name: path.basename(dirRel) || 'SpaceSwoosh' });
  }
  return groups.get(dirRel);
}

groupFor('SpaceSwoosh');
for (const f of [...swiftFiles, ...voiceFiles, infoPlist, privacyPlist]) {
  const rel = path.relative(root, f).replace(/\\/g, '/');
  const dir = path.posix.dirname(rel);
  const parts = dir.split('/');
  for (let i = 1; i <= parts.length; i++) {
    groupFor(parts.slice(0, i).join('/'));
  }
  groupFor(dir).children.push(ensureFile(f).ref);
}

const spaceGroup = groupFor('SpaceSwoosh');
spaceGroup.children.push(assets.ref);

const groupEntries = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
for (const [dir] of groupEntries) {
  if (dir === 'SpaceSwoosh') continue;
  const parent = path.posix.dirname(dir);
  if (!parent || parent === '.') continue;
  groupFor(parent).children.push(groupFor(dir).id);
}

let pbx = `// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 56;
	objects = {

/* Begin PBXBuildFile section */
`;

for (const f of swiftFiles) {
  const meta = ensureFile(f);
  pbx += `\t\t${meta.build} /* ${meta.name} in Sources */ = {isa = PBXBuildFile; fileRef = ${meta.ref} /* ${meta.name} */; };\n`;
}
pbx += `\t\t${assets.build} /* Assets.xcassets in Resources */ = {isa = PBXBuildFile; fileRef = ${assets.ref} /* Assets.xcassets */; };\n`;
const privacy = ensureFile(path.join(appRoot, 'PrivacyInfo.xcprivacy'));
pbx += `\t\t${privacy.build} /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = ${privacy.ref} /* PrivacyInfo.xcprivacy */; };\n`;
for (const f of voiceFiles) {
  const meta = ensureFile(f);
  pbx += `\t\t${meta.build} /* ${meta.name} in Resources */ = {isa = PBXBuildFile; fileRef = ${meta.ref} /* ${meta.name} */; };\n`;
}

pbx += `/* End PBXBuildFile section */

/* Begin PBXFileReference section */
`;
pbx += `\t\t${productRef} /* SpaceSwoosh.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = SpaceSwoosh.app; sourceTree = BUILT_PRODUCTS_DIR; };\n`;
for (const meta of fileRefs.values()) {
  const fileType = meta.hint;
  pbx += `\t\t${meta.ref} /* ${meta.name} */ = {isa = PBXFileReference; lastKnownFileType = ${fileType}; path = ${meta.name}; sourceTree = "<group>"; };\n`;
}
pbx += `\t\t${assets.ref} /* Assets.xcassets */ = {isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = "<group>"; };\n`;

pbx += `/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
		${frameworksPhase} /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		${mainGroup} = {
			isa = PBXGroup;
			children = (
				${spaceGroup.id} /* SpaceSwoosh */,
				${productsGroup} /* Products */,
			);
			sourceTree = "<group>";
		};
		${productsGroup} /* Products */ = {
			isa = PBXGroup;
			children = (
				${productRef} /* SpaceSwoosh.app */,
			);
			name = Products;
			sourceTree = "<group>";
		};
`;

for (const [dir, g] of groupEntries) {
  const childLines = [...new Set(g.children)].map((c) => `\t\t\t\t${c},\n`).join('');
  const groupPath = dir === 'SpaceSwoosh' ? 'SpaceSwoosh' : path.posix.basename(dir);
  pbx += `\t\t${g.id} /* ${g.name} */ = {
			isa = PBXGroup;
			children = (
${childLines}\t\t\t);
			path = ${groupPath};
			sourceTree = "<group>";
		};
`;
}

pbx += `/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		${targetId} /* SpaceSwoosh */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = ${targetConfigs} /* Build configuration list for PBXNativeTarget "SpaceSwoosh" */;
			buildPhases = (
				${sourcesPhase} /* Sources */,
				${frameworksPhase} /* Frameworks */,
				${resourcesPhase} /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = SpaceSwoosh;
			productName = SpaceSwoosh;
			productReference = ${productRef} /* SpaceSwoosh.app */;
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		${projectId} /* Project object */ = {
			isa = PBXProject;
			attributes = {
				BuildIndependentTargetsInParallel = 1;
				LastSwiftUpdateCheck = 1500;
				LastUpgradeCheck = 1500;
			};
			buildConfigurationList = ${projectConfigs} /* Build configuration list for PBXProject "SpaceSwoosh" */;
			compatibilityVersion = "Xcode 14.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = ${mainGroup};
			productRefGroup = ${productsGroup} /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				${targetId} /* SpaceSwoosh */,
			);
		};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		${resourcesPhase} /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				${assets.build} /* Assets.xcassets in Resources */,
				${privacy.build} /* PrivacyInfo.xcprivacy in Resources */,
${voiceFiles.map((f) => `\t\t\t\t${ensureFile(f).build} /* ${path.basename(f)} in Resources */,\n`).join('')}\t\t\t);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		${sourcesPhase} /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
${swiftFiles.map((f) => `\t\t\t\t${ensureFile(f).build} /* ${path.basename(f)} in Sources */,\n`).join('')}\t\t\t);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
		${projectDebug} /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ENABLE_MODULES = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = dwarf;
				GCC_DYNAMIC_NO_PIC = NO;
				IPHONEOS_DEPLOYMENT_TARGET = 17.0;
				ONLY_ACTIVE_ARCH = YES;
				SDKROOT = iphoneos;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
			};
			name = Debug;
		};
		${projectRelease} /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ENABLE_MODULES = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
				IPHONEOS_DEPLOYMENT_TARGET = 17.0;
				SDKROOT = iphoneos;
				SWIFT_COMPILATION_MODE = wholemodule;
				VALIDATE_PRODUCT = YES;
			};
			name = Release;
		};
		${debugConfig} /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 7;
				DEVELOPMENT_TEAM = "";
				GENERATE_INFOPLIST_FILE = NO;
				INFOPLIST_FILE = SpaceSwoosh/Info.plist;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = 1.0.0;
				PRODUCT_BUNDLE_IDENTIFIER = com.orbi.spaceswoosh;
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
				VERSIONING_SYSTEM = "apple-generic";
			};
			name = Debug;
		};
		${releaseConfig} /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 7;
				DEVELOPMENT_TEAM = "";
				GENERATE_INFOPLIST_FILE = NO;
				INFOPLIST_FILE = SpaceSwoosh/Info.plist;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = 1.0.0;
				PRODUCT_BUNDLE_IDENTIFIER = com.orbi.spaceswoosh;
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
				VERSIONING_SYSTEM = "apple-generic";
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		${projectConfigs} /* Build configuration list for PBXProject "SpaceSwoosh" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				${projectDebug} /* Debug */,
				${projectRelease} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		${targetConfigs} /* Build configuration list for PBXNativeTarget "SpaceSwoosh" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				${debugConfig} /* Debug */,
				${releaseConfig} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */
	};
	rootObject = ${projectId} /* Project object */;
}
`;

const outDir = path.join(root, 'SpaceSwoosh.xcodeproj');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'project.pbxproj'), pbx);
console.log(`Wrote ${path.join(outDir, 'project.pbxproj')}`);
console.log(`Swift sources: ${swiftFiles.length}`);
