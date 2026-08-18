# Fragancia

Maqueta web de **Fragancia**, perfumería árabe de Cochabamba, construida sobre la identidad
visual de `Identidad visual de perfumería de lujo/`.

Landing + catálogo reducido con secciones masculina y femenina, prerenderizado a HTML estático.

## Stack

| Pieza            | Elección                                                                  |
| ---------------- | ------------------------------------------------------------------------- |
| Runtime y gestor | Bun 1.3                                                                   |
| Framework        | Angular 22 con `@angular/build` (Vite en desarrollo, esbuild en build)    |
| Render           | `@angular/ssr` con `outputMode: "static"`: cada ruta se prerenderiza      |
| Diseño           | `@dravensoft/arena-angular` 10.0.0 con style plugin propio                |
| Iconografía      | Phosphor, servido como subconjunto autoalojado que genera `arena-to-prod` |
| Tests            | Vitest a través de `@angular/build:unit-test`                             |
| Formato y lint   | Prettier (convención Angular) y `angular-eslint`                          |

## Comandos

```bash
bun install
bun start              # servidor de desarrollo en http://localhost:4200
bun run build          # prerenderiza las 15 rutas en dist/fragancia/browser
bun run test           # suite Vitest
bun run lint           # angular-eslint
bun run format         # Prettier sobre todo el árbol
bun run audit:arena    # informe de Arena sobre las fuentes propias
bun run serve:static   # sirve el build estático en http://localhost:4173
```

### Acceso desde otros dispositivos de la red

El servidor de desarrollo está configurado en `angular.json`, no con flags en `package.json`,
porque son opciones del propio servidor Vite que usa `@angular/build:dev-server`:

```json
"serve": {
  "options": {
    "host": "0.0.0.0",
    "port": 4200,
    "allowedHosts": ["localhost", "127.0.0.1", "192.168.0.7", "192.168.0.9"]
  }
}
```

`host` lo saca de `localhost` y lo pone a escuchar en todas las interfaces. `allowedHosts` es la
opción de Vite del mismo nombre: sin ella, Vite responde `403` a cualquier petición cuya cabecera
`Host` no reconozca, que es la protección contra _DNS rebinding_. La lista de `security.allowedHosts`
en el target `build` es otra cosa y hace falta igual: protege el renderizado en servidor contra
SSRF, y por eso lleva los mismos nombres.

`bun start` imprime las URL de red. Si añades una interfaz o cambias de IP, hay que añadirla a las
dos listas. Si otro dispositivo no llega, mira el cortafuegos del equipo antes que la configuración.

Para el build estático no hace falta nada: `bun run serve:static` levanta `http-server`, que ya
escucha en todas las interfaces.

`bun run build` lleva `NODE_OPTIONS=--disable-warning=DEP0205`. No es nuestro: el worker de
prerenderizado de `@angular/build` 22.1.4 llama a `module.register()`, que Node 26 deprecó en
favor de `module.registerHooks()`
(`node_modules/@angular/build/src/utils/server-rendering/esm-in-memory-loader/register-hooks.js`),
y el aviso sale una vez por worker. El flag silencia **ese** código y ningún otro, así que
cualquier deprecación nuestra sigue apareciendo. Quita el flag cuando Angular actualice la
llamada.

`prestart`, `prebuild` y `pretest` ejecutan `prepare:assets`, que regenera `public/sitemap.xml`
y las hojas de estilo de Arena (`src/arena.generated.css`, `src/icons.generated.css`,
`src/plugin.generated.css`). Los tres archivos generados están en `.gitignore`.

## Identidad

La piel vive en dos archivos y ninguno de ellos es un componente:

- **`arena.config.json`** — las dos paletas y las tres fuentes de Arena, todas autoalojadas
  desde `public/fonts/`.
  - `noche` es la paleta por defecto y llega a `:root`: ónix `#080806`, marfil `#f4efe6`,
    oro `#d9b268`.
  - `femme` emite bajo `.arena-femme`: mismo ónix, oro rosa `#e3b8a6`. Se pone en el
    contenedor de las rutas `/perfumes/mujer`, nunca en la cabecera ni en el pie, que es la
    regla del manual: **una pieza, un metal**.
- **`design/fragancia/`** — el style plugin: `plugin.tokens.json` responde los 72 roles del
  kernel de Arena (esquinas a cero, filetes de un píxel, mayúsculas muy espaciadas, columna de
  1240 px, sin sombras en reposo) y `plugin.css` pinta dos motivos del manual que ningún rol
  expresa: el filete que sigue al titular de sección y el rombo del eslogan.

Sacramento no ocupa un hueco de Arena porque Arena tiene tres (display, body, mono). Se declara
como `@font-face` propio en `src/styles.css` bajo `--ff-slogan` y sólo se usa en eslóganes, en
caja baja, como manda el manual.

### Dos desviaciones deliberadas del manual

- **Sin degradados.** El manual define «Oro líquido» como degradado de marca; Arena prohíbe
  degradados en cualquier superficie. Se usa oro plano en todas partes.
- **Copy en español.** Arena pide copy en inglés. Manda el idioma del negocio.

## Ritmo y responsive

**El aire entre componentes es de Arena, no mío.** Arena no dibuja margen exterior en nada, así que
la separación la pone el consumidor, y para eso el paquete trae `css/rhythm.css`: `.arena-stack` y
`.arena-row` con los tres pasos del ritmo de página. Todo apilado o alineado del proyecto usa esas
clases sobre elementos propios. En mis hojas no queda ningún `display: flex` + `gap` inventado para
separar componentes; los cuatro `gap` que sobreviven son composición interna de un solo control
—icono y etiqueta— y usan `--gap-control` o `--gap-inline`, que son los roles que Arena declara
para eso.

Consecuencia práctica: el cuerpo de `arena-card` ya trae su propio `gap` y su `pad-surface`, así que
la tarjeta de perfume no añade nada; antes duplicaba esa separación a mano.

El propio armazón es un stack. `app-root` lleva `arena-shell arena-stack arena-stack--section`, así
que el paso de sección separa cabecera, contenido y pie. Sin él eran cero píxeles a ambos lados: el
aire bajo la cabecera venía del relleno interno del hero y el pie arrancaba pegado a la última
sección.

**La escalera de titulares es fluida.** Los pasos de `fs` son píxeles fijos y no encogen, así que el
titular del hero a 96 px desbordaba un móvil de 360 px. `design/fragancia/plugin.css` resuelve cada
rung con `clamp()` sobre los mismos tokens, por los part hooks:

```css
[data-arena-part='hero.title'] {
  font-size: clamp(var(--fs-h1), 11vw, var(--step-title-hero));
}
```

El techo sigue siendo el rol, así que el escritorio no se mueve y el móvil baja hasta un peldaño
que cabe. Lo mismo para `page-head.title`, `section.title` y el logotipo del lockup.

**La cabecera pierde su etiqueta en el móvil.** Bajo `30rem` el enlace de WhatsApp se queda con el
icono: el texto se oculta y el control toma `--dz-ctl-h` en ambos ejes, así que el objetivo táctil
mide lo mismo que cualquier control de Arena. El nombre accesible no depende de lo que se ve —vive
en un `aria-label` del enlace— así que un lector de pantalla anuncia «Escríbenos por WhatsApp» en las
dos anchuras. La cabecera pasa de 202 px de alto a 133 px en un móvil de 390 px.

Es la única consulta de medios del proyecto. Arena no escribe ninguna por anchura en sus propias
hojas y prefiere que el ancho lo decida el propio layout, pero mostrar u ocultar es una decisión
discreta, no fluida, y `arenaViewportBelow` no sirve aquí: en el prerenderizado `--bp-sm` no resuelve
y la rama ancha se serviría al móvil hasta que hidrate. El `30rem` restata el valor de `--bp-sm`
porque una media query no puede leer un `var()`.

Barrido de `320`, `360`, `390`, `768` y `1024 px` sobre las cuatro plantillas: `scrollWidth` igual al
viewport y cero elementos desbordados. Si añades markup nuevo, esa es la comprobación que hay que
repetir.

## Convenciones de código

- Cero comentarios en todo el árbol, incluidos los que traía el andamiaje del CLI.
- Todo el código en inglés. Sólo las rutas y el texto de interfaz van en español.
- Ninguna clase propia sobre un elemento de Arena, y ningún valor crudo: todo se lee por su
  token. `bun run audit:arena` es lo que lo comprueba.

## Rutas

| Ruta                              | Qué es                                                       |
| --------------------------------- | ------------------------------------------------------------ |
| `/`                               | Landing: hero, destacados, las dos líneas, la casa, contacto |
| `/perfumes/hombre`                | Línea Homme, en oro                                          |
| `/perfumes/mujer`                 | Línea Femme, en oro rosa                                     |
| `/perfumes/{hombre,mujer}/<slug>` | Ficha por perfume                                            |

## El catálogo

La fuente es `content/`: un archivo YAML por registro, `content/lines/<línea>.yml` para la copia de
cada línea y `content/perfumes/<línea>/<slug>.yml` para cada ficha. Un archivo por ficha, para que
cada guardado toque uno solo y el diff se lea; partido por línea, porque el slug es único **dentro**
de su línea y no en todo el catálogo, así que un directorio plano forzaría una unicidad que el
modelo no pide.

`scripts/generate-catalog.ts` lo valida y emite `src/app/catalog/perfumes.generated.ts`, que es un
producto de build: no se edita y no se commitea. Corre el primero en `prepare:assets`, antes que el
sitemap, que lee lo que él escribe.

Las reglas viven aparte, en `src/app/catalog/catalog.schema.ts`, como funciones puras que Vitest
prueba una por una. El generador sólo hace la entrada y salida. **Un archivo inválido rompe
`bun run build` a propósito**: el despliegue no reemplaza un contenedor que compiló bien, así que el
sitio sigue sirviendo la última versión buena mientras se arregla.

`inStock` es un booleano y no una cantidad. Por eso `offers.availability` es un hecho en el HTML
prerenderizado y no un dato que aparece tras la hidratación, que ningún crawler ve. Un perfume
agotado se marca _Agotado_ y sigue listado, prerenderizado y en el sitemap: una ficha que dice
agotado es mejor que un 404 en una URL ya indexada.

## El panel

`/admin` es Sveltia CMS, vendorizado en `public/admin/` y servido desde nuestro propio dominio: no
hay CDN en tiempo de ejecución. `angular.json` ya copia `public/**` salvo los `*.md`, así que llega
al build sin configurar nada, y `robots.txt` lo prohíbe.

Son **dos colecciones, una por línea**. `line` no es un campo del formulario: es un valor oculto con
el valor por defecto de su colección, así que se deriva del directorio donde se guarda y el dueño no
puede equivocarlo. El nombre del archivo sale del propio slug, así que tampoco pueden discrepar.

El formulario repite los límites del validador —obligatorios, el patrón del slug, los enteros con
mínimo y máximo, entre una y ocho notas, la concentración como lista cerrada— para que lo que el
build rechazaría tarde sea imposible temprano. Las fotos se convierten a WebP **en el navegador del
dueño** antes de subirse, con tamaño y calidad limitados, así que un JPEG de 5 MB no llega nunca al
repositorio.

No hay entorno de pruebas: el panel escribe directo a `main` y `main` es lo que se despliega. Para
un solo usuario una rama intermedia es ceremonia. El seguro es que cada guardado es un commit suyo,
así que **deshacer un desastre es revertir un commit**.

## SEO

- Cada ruta sale del build como HTML completo, no como cáscara que hidrata.
- `provideArenaMetadata` compone título, descripción, canonical y `og:*` desde
  `src/app/seo/site.ts`. Las fichas describen el registro que cargan, vía
  `ArenaMetadataService.apply`.
- JSON-LD: `WebSite` y `Store` en la landing, `ItemList` en cada línea, `Product` con `Offer`
  en cada ficha, y `BreadcrumbList` que publica `ArenaBreadcrumbs` por su cuenta.
- `public/robots.txt` y `public/sitemap.xml`, este último generado desde el mismo catálogo.

Cambiar de dominio es una línea: `SITE_ORIGIN` en `src/app/seo/site.ts`.

## Despliegue

`.github/workflows/pages.yml` publica cada push a `main` en
`dravensoft-dev.github.io/fragancia/`. Eso es una maqueta para enseñar el sitio, no el sitio: el
ambiente final es `fragancia.com.bo` y el árbol sigue configurado para él —`SITE_ORIGIN` apunta al
dominio real, `<base href>` es `/` y `robots.txt` permite todo.

Lo que la maqueta necesita vive en el despliegue, no en el código:

- el subpath es una bandera del build, `ng build --base-href=/fragancia/`, de la que Angular deriva
  el `<base>` y cada `routerLink`;
- las URL que escribimos nosotros —el `href` de la tarjeta, las migas, la foto— pasan por
  `Location.prepareExternalUrl()`, que es la identidad en la raíz y por tanto no le cuesta nada a
  producción;
- `scripts/pages-preview.ts` reescribe lo único que la bandera no alcanza, los `url()` de las
  fuentes en el CSS, y **duerme el SEO**: `noindex,nofollow` en cada página, `Disallow: /` en
  `robots.txt` y ningún `sitemap.xml` en el artefacto.

Así la maqueta se ve entera y no compite en Google con el sitio que todavía no existe. El canonical
de cada página sigue señalando a `fragancia.com.bo`, que es lo que corresponde.

## Lo que falta

Las fotografías de producto y la imagen de Open Graph. Ver `public/img/perfumes/README.md` y
`public/og/README.md`; hasta que lleguen, cada ficha dibuja el marcador de la marca.
