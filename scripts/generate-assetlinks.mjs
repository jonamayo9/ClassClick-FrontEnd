import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const defaultFingerprint =
  '18:71:45:F9:F2:E1:EC:07:C9:F2:9E:A1:F3:14:A8:F5:C2:16:4B:85:A6:8C:B2:27:C3:EE:31:F1:81:AD:9E:64';

const fingerprint =
  process.env.ANDROID_APP_LINK_SHA256?.trim() || defaultFingerprint;

if (!/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/i.test(fingerprint)) {
  console.error(
    'ANDROID_APP_LINK_SHA256 debe ser una huella SHA-256 válida separada por dos puntos (32 bytes hexadecimales).',
  );
  process.exit(1);
}

const target = resolve('public/.well-known/assetlinks.json');

mkdirSync(dirname(target), { recursive: true });

const json = `[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.systemsdevsolutions.classclick",
      "sha256_cert_fingerprints": [
        "${fingerprint}"
      ]
    }
  }
]
`;

writeFileSync(target, json, 'utf8');

console.log(`assetlinks.json generado en ${target}`);
