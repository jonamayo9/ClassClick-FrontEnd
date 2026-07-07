# Publicacion Android con TWA

ClassClick ya tiene base PWA local: `manifest.json`, `service-worker.js`, iconos y deteccion de app instalada. Para publicar en Play Store conviene usar Trusted Web Activity con Bubblewrap, asi Android abre la PWA en pantalla completa sin WebView propio.

## Datos necesarios

- Dominio publico final de la app web. Recomendado: `https://classclick.com.ar`.
- URL publica de API ya productiva: `https://api.classclick.com.ar`.
- Nombre visible: `ClassClick`.
- Package name Android. Recomendado: `ar.com.classclick.app`.
- Cuenta Google Play Console activa.
- Politica de privacidad publica.
- Textos de ficha, capturas, icono de alta resolucion y grafico destacado.
- Dispositivo Android real para probar biometria, push, login y pagos.

## Bloqueos actuales

- `https://classclick.com.ar/manifest.json` esta devolviendo HTML, no el manifest.
- `https://classclick.com.ar/config.json` tambien devuelve HTML.
- El dominio publico parece estar sirviendo una landing vieja, no el build React actual.
- Java no esta en `PATH`, pero existe en Android Studio: `C:\Program Files\Android\Android Studio\jbr`.
- Bubblewrap no esta instalado globalmente. Se puede usar con `npx @bubblewrap/cli`.

## Antes de generar el AAB

1. Publicar el build React actual en el dominio final.
2. Verificar que estas URLs devuelvan archivos reales:
   - `https://classclick.com.ar/manifest.json`
   - `https://classclick.com.ar/config.json`
   - `https://classclick.com.ar/service-worker.js`
   - `https://classclick.com.ar/icons/icon-192.png`
   - `https://classclick.com.ar/icons/icon-512.png`
3. Confirmar que `manifest.json` tenga `display: "standalone"`, `start_url`, `scope`, `theme_color`, iconos `192` y `512`.
4. Configurar WebAuthn backend para el dominio real:
   - `WebAuthn:ServerDomain=classclick.com.ar`
   - `WebAuthn:Origins=https://classclick.com.ar`
5. Confirmar que push web funcione desde la PWA instalada.

## Generacion TWA

Comandos sugeridos desde una carpeta nueva, por ejemplo `ClassClick-Android`:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\build-tools\36.1.0;$env:PATH"

npx @bubblewrap/cli init --manifest https://classclick.com.ar/manifest.json
npx @bubblewrap/cli build
```

Bubblewrap va a generar el proyecto Android y el paquete firmado. Para Play Store se sube el `.aab`, no el APK.

## Digital Asset Links

Despues de generar la app y tener la firma, hay que publicar:

```text
https://classclick.com.ar/.well-known/assetlinks.json
```

Ese archivo debe incluir el package name y el SHA-256 del certificado de firma. Sin esto, Android abre como Custom Tab y no como TWA completa.

## Prueba interna

1. Crear app en Play Console.
2. Cargar ficha minima, privacidad y seguridad de datos.
3. Subir el `.aab` a prueba interna.
4. Instalar desde Play Internal Testing en Android real.
5. Validar:
   - Login admin, alumno y docente.
   - Biometria al abrir y al volver del segundo plano.
   - Push/campanita.
   - Pagos, comprobantes y financiacion.
   - Cuotas automaticas y vencimientos.
   - Que no aparezcan prompts de instalacion dentro de la app instalada.
