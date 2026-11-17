<div align="center">

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · **Español** · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md)
· [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

# @dsh-plugins/file-upload

Una **fila de clip bajo Tareas de automatización** en la barra lateral web de [DSH](https://github.com/deepseek-ai/deepseek-harness) que abre una página de subida: elegir una carpeta en el host igual que lo hace el diálogo del espacio de trabajo, seleccionar varios archivos a la vez y observar cómo cada uno se sube con su propia barra de progreso.

<img src="../assets/uploaded.png" alt="La página Subir archivo después de que tres archivos hayan terminado de subirse: la fila del clip está seleccionada en la barra lateral izquierda, la carpeta de destino está establecida y cada fila muestra una barra verde y la etiqueta Subido" width="1200" />

<sub>Los nombres de espacios de trabajo y de sesiones de la barra lateral están difuminados.</sub>

</div>

## Por qué

DSH puede mover bytes *fuera* del espacio de trabajo ([`@dsh-plugins/file-download`](https://github.com/tribesman/dsh-file-download)) y prepara adjuntos del navegador para un prompt, pero no había forma de colocar varios archivos existentes en una carpeta del servidor sin una shell en el host. Este plugin aporta la pieza que faltaba, en el lugar donde viven los demás paneles globales.

## Dónde aparece

| Lugar | Qué |
| --- | --- |
| Barra lateral izquierda | Una fila **Subir archivo** con un glifo de clip, justo debajo de **Tareas de automatización** (`order: 11`) |
| Columna principal | La página de subida, que se abre al seleccionar esa fila |

<img src="../assets/upload-page.png" alt="La página Subir archivo sin destino elegido todavía: la fila de la barra lateral está bajo Tareas de automatización, la página muestra una tarjeta de destino y una zona para soltar archivos con línea discontinua" width="1200" />

Todo en la página es un solo flujo:

1. **Carpeta de destino** — *Elegir carpeta* abre un diálogo dentro de la aplicación impulsado por el propio listado de directorios del host (`ctx.uiWorkspace.listDirectory`, la misma primitiva que hay detrás de **Seleccionar directorio del espacio de trabajo**): saltos en las migas de pan, una ruta editable con un clic, un interruptor de carpetas ocultas y una confirmación final *Elegir esta carpeta*. La lista de carpetas viene del host, así que funciona desde un navegador remoto donde no existe un selector del sistema operativo.

   <img src="../assets/folder-picker.png" alt="El diálogo Elegir carpeta en el servidor: las migas de pan muestran Inicio y la carpeta demo, con archive, photos y reports listados" width="1200" />

2. **Elegir archivos** — el selector de archivos de la página acepta varios archivos a la vez, y los archivos que se sueltan en cualquier punto de la página se unen a la misma cola.
3. **Subir archivos** — la cola procesa un archivo a la vez; cada fila muestra el contador de bytes enviados, una barra de progreso y una etiqueta de estado. Una fila fallida conserva su mensaje y ofrece **Reintentar**; **Cancelar subida** detiene la cola y deja listas las filas restantes.

   <img src="../assets/uploading.png" alt="Una subida en curso: la primera fila informa de 215 MB de 800 MB con una barra a medio llenar y la etiqueta Subiendo, las demás filas esperan como Listo y el encabezado ofrece Cancelar subida" width="1200" />

## Cómo funciona

**Mitad host** — una ruta de streaming autenticada sobre la barrera `/api` compartida:

```
POST /api/file-upload/write?dir=<absolute folder>&name=<file name>
content-type: application/octet-stream
```

Se apoya en `ctx.connection.fetch`, de modo que Connection admite la solicitud contra la credencial Harness firmada del navegador antes de que se ejecute este manejador: una solicitud no autenticada nunca llega a él y solo se atiende al Peer propietario. Ambas coordenadas se validan (un directorio absoluto y existente; un nombre de archivo simple sin separador), y el cuerpo se transmite directamente a un archivo hermano `.dsh-upload-<uuid>.part` que solo se renombra a su sitio cuando ha llegado el último byte: una subida abortada o fallida no deja nada bajo el nombre real.

**Mitad navegador** — un bundle lazy-CJS escrito a mano que solo requiere la base que aporta el shell (`react`, `react-dom`). Registra dos contribuciones: la fila `sidebar.panellist` y el panel `main` con la misma clave, que es todo el contrato que la barra lateral necesita para seleccionarlo. El `XMLHttpRequest` simple en el hilo de la página es lo que hace real el progreso por archivo: `xhr.upload.onprogress` informa de los bytes que el navegador ha entregado realmente al socket.

## Instalación

El paquete es un **bundle** (`dsh.bundle.patch`), así que el Gestor de plugins puede instalarlo y actualizarlo como una sola fila:

```bash
# desde un checkout — enlaza este directorio, los cambios siguen activos
dsh plugin --profile web add /path/to/dsh-file-upload

# o desde el remoto de git
dsh plugin --profile web add "git+https://github.com/tribesman/dsh-file-upload.git"
```

También se puede seguir cualquiera de los dos caminos desde la interfaz: **Plugins → Añadir plugin**.

Sin `dsh` en el `PATH`, cree un enlace simbólico al checkout dentro del perfil y añada la fila a mano:

```yaml
# $DSH_HOME/profiles/web/cordis.patch.yml
- insert:
    - id: file-upload-panel
      name: '@dsh-plugins/file-upload'
```

```bash
ln -s /path/to/dsh-file-upload \
  "$DSH_HOME/profiles/web/node_modules/@dsh-plugins/file-upload"
```

El id de la fila no debe repetir uno ya distribuido: `file-upload` ya pertenece a `@deepseek-ai/dsh-client-file-upload`, el transporte de adjuntos del prompt en el navegador, y dos entradas del Loader que comparten un id solo componen una de ellas. De ahí `file-upload-panel`.

Reinicie el harness una vez para que se componga una fila del Loader recién añadida. En una instancia en vivo, una fila insertada se monta sin reiniciar.

Compruebe que funciona: la barra lateral añade **Subir archivo** justo debajo de **Tareas de automatización**, la página lista la carpeta de inicio del host y una subida terminada acaba en la carpeta que eligió:

```bash
ls -l "/the/folder/you/chose"
```

## Configuración

Ambos parámetros viven en la `config` de la fila del plugin, así que la capa de parche del perfil los conserva entre actualizaciones:

```yaml
- id: file-upload-panel
  name: '@dsh-plugins/file-upload'
  config:
    maxFileBytes: 1048576      # por defecto 1073741824 (1 GiB), 1024 … 16 GiB
    conflict: overwrite        # por defecto "rename"
```

| Campo | Valor por defecto | Significado |
| --- | --- | --- |
| `maxFileBytes` | `1073741824` | Límite superior inclusivo para un archivo; un cuerpo mayor se rechaza con `413` y no se almacena nada |
| `conflict` | `"rename"` | Qué significa un nombre ya ocupado: `rename` conserva el archivo existente y coloca el nuevo como `name (1).ext`; `overwrite` lo reemplaza |

La fila declara su esquema como un Standard Schema escrito a mano, así que los valores anteriores se validan cuando el plugin se activa y un valor incorrecto hace fallar la fila con un error. El Gestor de plugins solo lee grafos Schemastery nativos, por lo que su formulario de configuración informa del esquema de esta fila como no admitido y no ofrece campos: establezca los valores en el parche, como se muestra arriba.

## Notas de seguridad

- La ruta es una **ruta exacta sobre la barrera `/api` de Connection**, no una ruta cruda de servidor web, así que requiere la cookie de sesión firmada del navegador y solo atiende al Peer propietario. Tampoco añade ninguna flexibilización propia de Host/Origin.
- La ruta escribe donde el operador autenticado la apunta, con los permisos del proceso DSH: el mismo alcance que ya tienen el selector de directorio del espacio de trabajo y la herramienta `bash`. El destino debe existir ya; el plugin no crea carpetas.
- El navegador nombra una carpeta y un nombre de archivo, nunca una ruta dentro de una: el nombre no contiene `.` ni separadores, así que una solicitud no puede escapar de la carpeta elegida.
- Los archivos temporales se crean junto a su destino y se eliminan en caso de fallo o cancelación; no queda nada bajo el nombre final a menos que hayan llegado todos los bytes.

## Limitaciones conocidas

- Una cola de subida por visita a la página: la lista es local a la página, y salir de ella a mitad de una subida mantiene la transferencia en marcha (el host termina el archivo) pero olvida las filas.
- No se crean carpetas en el selector y no hay reanudación: una subida fallida vuelve a empezar desde el primer byte.
- El selector solo lista carpetas, y los niveles cortados informan de `truncated` en lugar de paginar.
- La página no tiene una comprobación previa en el cliente para `maxFileBytes`: el host rechaza un archivo demasiado grande después de la transferencia.
- El host escribe el texto de error en inglés y conserva el código errno en el mensaje.

## Desarrollo

```bash
npm test        # node --test: 22 casos sobre la ruta y el bundle
npm run check   # control de sintaxis para ambas mitades
```

Las pruebas del host ejercitan la ruta con objetos `Request`/`Response` reales y un directorio temporal real, así que cubren la ruta de los bytes, las políticas de conflicto, el límite de tamaño, la cancelación y el texto de error sin un harness. Las pruebas del navegador ejecutan el bundle en una VM con un React y un DOM simulados, así que no necesitan ni un harness ni un navegador.

## Archivos

| Ruta | Función |
| --- | --- |
| `lib/index.js` | Mitad host: la ruta de escritura en streaming y su esquema de configuración |
| `lib/client.js` | Mitad navegador: bundle lazy-CJS, fila de la barra lateral, página, diálogo de carpetas |
| `cordis.patch.yml` | Parche del bundle: la única fila del host |
| `locale/*.json` | Título y descripción mostrados por el Gestor de plugins |
| `icon.svg` | El icono de mosaico con el clip |
| `docs/assets/*.png` | Capturas usadas por este README y sus traducciones |
| `docs/readme/README_*.md` | Los READMEs traducidos |
| `test/host.test.mjs` | Comportamiento de la ruta: estados, políticas, límite, cancelación, texto de error |
| `test/client.test.mjs` | Contrato del bundle: forma de la fila, orden, diccionarios, hoja de estilos |

## Traducciones

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · **[Español](README_es.md)** · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md) · [Ελληνικά](README_el.md) · [മലയാളം](README_ml.md) · [Roman Urdu](README_ur-Latn.md) · [Română](README_ro.md) · [Български](README_bg.md)

Los READMEs traducidos viven en [`docs/readme/`](.). Describen el mismo plugin; cuando difieran de este archivo, prevalece este archivo.

## Licencia

MIT.
