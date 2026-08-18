# Admin de un solo usuario sobre Git

Fecha: 2026-08-18
Estado: aprobado, pendiente de plan de implementación

## Problema

El dueño de la perfumería necesita subir fotos de sus perfumes, dar de alta fichas nuevas y marcar
un perfume como agotado, sin pasar por un desarrollador. Es **un solo usuario**, así que construir
autenticación propia es infraestructura desproporcionada.

El sitio es Angular 22 con `outputMode: "static"`: cada ruta se prerenderiza y no hay servidor en
tiempo de ejecución. El catálogo vive hoy como constante TypeScript en `perfumes.data.ts`, leída a
la vez por la app, por `getPrerenderParams` y por el generador del sitemap.

## Decisión

Para un solo administrador **no se construye login, se delega la identidad**. El catálogo pasa a
ser contenido editable en el repositorio, un CMS sobre Git le da un formulario al dueño, y GitHub
le da la identidad. El despliegue lo cierra Dokploy, que reconstruye en cada push.

El stock es un **booleano** (`inStock`), no un número. Eso mantiene el sitio 100 % estático y deja
que `offers.availability` del JSON-LD sea verdad en el HTML prerenderizado, en vez de un dato que
sólo aparece tras la hidratación y que ningún crawler ve.

### Alternativas descartadas

- **BaaS (Supabase, Pocketbase).** Da login de verdad, pero mueve el stock a tiempo de ejecución:
  un `fetch` tras la hidratación, invisible para Google, y una dependencia externa que puede caerse.
  Se reconsidera cuando exista carrito o pedidos, que es cuando de verdad hace falta un backend.
- **Hoja de cálculo como fuente.** Lo más barato, pero las fotos quedan frágiles y se pierde la
  validación de tipos hasta el build.
- **Pages CMS alojado.** Cero infraestructura, pero el panel del cliente viviría en el dominio de un
  tercero. Con servidor propio ya disponible, la ventaja no compensa la dependencia.
- **GitLab o Forgejo con PKCE.** Eliminaría el proxy OAuth, pero el autodespliegue de Dokploy es
  cero configuración precisamente con GitHub.

## Alcance

Dentro:

- Migración del catálogo de constante TypeScript a archivos de contenido en `content/`.
- Generador validador que emite el catálogo tipado como producto de build.
- Campo `inStock` en el modelo, en la interfaz y en el JSON-LD.
- Panel `/admin` con Sveltia CMS, configurado y validado.
- Cliente OAuth desplegado aparte, y la configuración de despliegue en Dokploy.

Fuera:

- Precios, stock numérico, carrito, pedidos, usuarios múltiples, roles.
- Edición de la copia de las líneas fuera de los campos que ya existen en `LineProfile`.
- Traducciones o i18n.

## Arquitectura

Cuatro piezas y un lazo:

```
navegador del dueño          GitHub                    Dokploy
┌──────────────────┐         ┌──────────────┐          ┌─────────────────┐
│ /admin           │ token   │ repo         │ webhook  │ app: fragancia  │
│ Sveltia CMS      ├────────►│ content/*.yml├─────────►│ bun run build   │
│                  │         │ public/img/  │          │ → estático      │
└────────┬─────────┘         └──────────────┘          └─────────────────┘
         │ code → token
         ▼
┌──────────────────┐
│ auth.<dominio>   │  app: fragancia-auth
│ cliente OAuth    │  guarda el client secret
└──────────────────┘
```

El secreto de la OAuth App vive sólo en `fragancia-auth`. El navegador del dueño sólo llega a tener
un token de GitHub a su nombre, con el alcance del repositorio.

## Fuente de datos: `content/`

Un archivo YAML por registro. YAML porque `Bun.YAML.parse` es nativo en Bun 1.3.14 y no añade
dependencias, y porque se lee bien a mano cuando haga falta editar sin CMS.

```
content/
  lines/
    hombre.yml
    mujer.yml
  perfumes/
    hombre/
      khamrah.yml
      9pm.yml
    mujer/
      yara.yml
      ...
```

Un perfume por archivo, no una lista dentro de un archivo: cada guardado toca un solo archivo, el
diff es legible y dos ediciones seguidas no se pisan.

**El directorio se parte por línea, y no es cosmético.** El slug sólo es único _dentro_ de su
línea —`catalog.spec.ts` afirma exactamente eso, y `bySlug('hombre', 'yara')` devuelve indefinido
mientras `bySlug('mujer', 'yara')` existe—, así que un `content/perfumes/` plano forzaría una
unicidad global que el modelo no exige y haría colisionar dos fichas legítimas en un mismo archivo.
Anidar por línea refleja la URL `/perfumes/<line>/<slug>` y elimina el problema.

Tiene un segundo beneficio: el CMS declara **dos colecciones**, una por línea, así que `line` deja
de ser un campo que el dueño pueda equivocar y pasa a derivarse del directorio en el que guarda.

`content/` se versiona. Es la fuente, no un producto. `content/` entra en `.prettierignore`: el
formato de esos archivos lo decide el CMS, y que Prettier los reescriba sólo genera ruido en el
historial.

## El generador y sus validaciones

Dos módulos con responsabilidades separadas:

- **`src/app/catalog/catalog.schema.ts`** — validación pura, sin E/S. Recibe un objeto ya parseado
  y devuelve la lista de errores. Es código de `src/`, así que Vitest lo prueba directamente. No lo
  importa ningún componente, así que no entra en el bundle.
- **`scripts/generate-catalog.ts`** — lee `content/`, llama al validador, formatea los errores y
  emite `src/app/catalog/perfumes.generated.ts`.

### Reglas por perfume

| Campo           | Regla                                                                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slug`          | requerido, `^[a-z0-9]+(-[a-z0-9]+)*$`, **igual al nombre del archivo**                                                                                                      |
| `name`          | requerido, 1–60 caracteres                                                                                                                                                  |
| `brand`         | requerido, no vacío                                                                                                                                                         |
| `line`          | requerido, exactamente `hombre` o `mujer`, **y igual al directorio que lo contiene**                                                                                        |
| `family`        | requerido, no vacío                                                                                                                                                         |
| `notes`         | requerido, entre 1 y 8 cadenas no vacías                                                                                                                                    |
| `sizeMl`        | requerido, entero, 1–1000                                                                                                                                                   |
| `priceBob`      | requerido, entero, 1–100000                                                                                                                                                 |
| `concentration` | requerido, uno de `Eau de parfum` o `Eau de toilette`                                                                                                                       |
| `summary`       | requerido, 30–110 caracteres — ver más abajo                                                                                                                                |
| `description`   | requerido, mínimo 80 caracteres                                                                                                                                             |
| `featured`      | requerido, booleano                                                                                                                                                         |
| `inStock`       | requerido, booleano                                                                                                                                                         |
| `order`         | requerido, entero 0–999, por defecto 100                                                                                                                                    |
| `photo`         | opcional; `^/img/perfumes/[a-z0-9-]+\.(webp\|jpg\|png)$` **y el archivo debe existir**. El CMS siempre sube `.webp`; los otros dos se admiten para archivos añadidos a mano |

Cualquier clave desconocida es un error, no un campo ignorado: un `precioBob` mal escrito debe
gritar, no desaparecer en silencio.

### La meta description es compuesta, y ese es el límite real

`perfume-detail` no usa `summary` como meta description: la compone.

```
`${perfume.summary} ${perfume.concentration} de ${perfume.sizeMl} ml por Bs ${perfume.priceBob} en Cochabamba.`
```

La cola añade unos 50 caracteres. Poner el límite en `summary` sería medir la pieza equivocada, así
que **el validador comprueba la cadena compuesta contra el máximo de 160** y deja a `summary` un
rango holgado de 30 a 110.

Los `summary` actuales miden entre 35 y 51 caracteres, y la meta description más larga que producen
son 101. Un mínimo de 40 en `summary` —que es lo que este spec decía antes de revisarse— habría
rechazado seis de los doce perfumes existentes y roto la migración el primer día. El rango va
medido contra los datos reales, no contra una cifra redonda.

### El orden de presentación

Hoy el orden lo da la posición dentro del array de `perfumes.data.ts`. Un archivo por ficha lo
pierde: el directorio se lee alfabéticamente. Se recupera con un campo explícito.

El catálogo generado se ordena de forma determinista por **línea** —siguiendo el orden declarado en
`content/lines/`—, luego por `order` ascendente, y los empates por `name`. El formulario muestra
`order` con 100 por defecto, así que el dueño nunca tiene que tocarlo salvo que quiera mover algo
al principio.

Sin esto, dar de alta un perfume reordenaría la parrilla entera sin que nadie lo pidiera.

### Reglas entre archivos

- Slug único dentro de su línea.
- Al menos un perfume por línea, o la página de línea queda vacía.
- Entre 2 y 8 perfumes con `featured: true`, y al menos uno por línea. Hoy son 4, dos por línea.
- Toda `line` referenciada tiene su perfil en `content/lines/`.

### Reglas por línea

`line` en el conjunto cerrado; `path` igual a `/perfumes/<line>`; `label`, `descriptor`,
`sloganLead`, `slogan` y `lede` no vacíos; `metaDescription` de 50 a 160 caracteres;
`rosegold` booleano.

### Comportamiento ante el error

- **Acumula todos los errores** y los imprime agrupados por archivo. No falla al primero: quien
  lea la salida debe ver todo lo que está mal de una vez.
- **No escribe nada si algo falla.** El archivo generado se emite sólo cuando la validación entera
  pasa, así que nunca queda un catálogo a medias en disco.
- Sale con código 1.

```
content/perfumes/yara.yml
  priceBob: se esperaba un entero entre 1 y 100000, se recibió "320 Bs"
  photo: /img/perfumes/yara.webp no existe
content/perfumes/khamrah.yml
  slug: "Khamrah" no coincide con el nombre del archivo "khamrah"
catalog: 3 errores
```

### Por qué esto protege producción

`prepare:assets` ya corre en `prestart`, `prebuild` y `pretest`. El generador se pone **primero**,
antes de `generate-sitemap.ts`, que importa el catálogo generado. Un archivo de contenido inválido
rompe `bun run build` antes de que Angular arranque. Dokploy no reemplaza un contenedor cuyo build
falló: **el sitio sigue sirviendo la última versión buena.**

El dueño, sin embargo, no se entera de que su cambio no llegó. De ahí que la primera línea de
defensa esté en el propio formulario, y de ahí las notificaciones de Dokploy.

### Consecuencia sobre `scripts/CLAUDE.md`

La regla vigente dice que ningún script escribe bajo `src/`. Hay que enmendarla: un script puede
escribir un producto de build `*.generated.*` bajo `src/`, nunca un archivo fuente. Es lo que
`arena-to-prod` ya hace con `src/*.generated.css`.

`src/app/catalog/perfumes.generated.ts` se suma a `.gitignore`, `.prettierignore` y a los
`ignores` de ESLint, y `perfumes.data.ts` desaparece. Todo lo que hoy importa `perfumes.data`
—`catalog.ts`, `app.routes.server.ts`, `generate-sitemap.ts`— pasa a importar el generado.

Con esto, un clon recién hecho **no compila hasta la primera generación**, igual que hoy no tiene
las hojas de Arena. `prestart`, `prebuild` y `pretest` ya lo cubren; hay que añadir `prelint` para
que `bun run lint` no sea el único comando que se encuentre el archivo ausente.

## `inStock` en la interfaz y en el SEO

- **`perfume-card`**: distintivo _Agotado_ cuando `inStock` es falso. Tono neutro, no dorado: la
  regla de un solo acento por vista se mantiene, y el oro es distinción, no aviso.
- **`perfume-detail`**: el mismo distintivo, y el CTA de WhatsApp cambia su copia a _Consultar
  disponibilidad_.
- **JSON-LD**: `availability` pasa de la constante `https://schema.org/InStock` a depender del
  campo, con `https://schema.org/OutOfStock` en el otro caso.
- **Un perfume agotado sigue listado, prerenderizado y en el sitemap.** Una ficha que dice
  "agotado" es mejor que un 404 para una URL ya indexada. Dar de baja de verdad es tarea de
  desarrollador.

## El panel `/admin`

`public/admin/` con `index.html`, `config.yml` y el JS de Sveltia vendorizado — nada de CDN.
`angular.json` ya copia `public/**` salvo `*.md`, así que llega al build sin tocar configuración.

Es una aplicación de terceros en un directorio aislado: queda **fuera** de las reglas de Arena y de
la prohibición de comentarios del proyecto. No es código nuestro.

`public/robots.txt` gana `Disallow: /admin/`. El sitemap se genera desde el catálogo, así que
`/admin` nunca entra en él.

### Validaciones en el formulario, primera línea de defensa

Lo que el generador comprueba tarde, el formulario lo hace imposible temprano:

- `required: true` en todos los campos.
- `select` para `concentration`, con las dos opciones que existen hoy: `Eau de parfum` y
  `Eau de toilette`. Ampliarlas es editar esa lista y el validador a la vez.
- `line` no es un campo: es un valor oculto con el valor por defecto de su colección. Una colección
  por línea, cada una apuntando a su directorio.
- `pattern` en el slug, con mensaje en español.
- `value_type: int` con `min`/`max` en `sizeMl` y `priceBob`.
- `list` con `min: 1, max: 8` para las notas.
- `boolean` con `default: true` en `inStock` y `default: false` en `featured`.
- `number` con `default: 100` en `order`, para que el orden no sea una decisión que deba tomar.
- El nombre del archivo se deriva del propio campo slug, así que no pueden discrepar.
- Medios: `media_folder: public/img/perfumes` con `public_folder: /img/perfumes`, para que la ruta
  que el CMS escribe en `photo` sea exactamente la que el validador y las plantillas esperan.
- Medios: `max_file_size`, `slugify_filename: true` y `transformations` a webp con ancho máximo y
  calidad — la conversión ocurre en el navegador del dueño antes de subir, así que un JPEG de 5 MB
  no llega nunca al repositorio.
- Sin flujo editorial: escritura directa a `main`. Para un usuario, los borradores son ceremonia.
- Borrado de fichas deshabilitado si la colección lo permite. Retirar un perfume es `inStock: false`.

## Autenticación

**Montaje, una vez.** El dueño tiene cuenta de GitHub y es colaborador con permiso de escritura. Se
registra una OAuth App con _Homepage_ en el dominio y _callback_ en `https://auth.<dominio>/callback`.
El dominio aún no está comprado; `SITE_ORIGIN` ya vale `https://fragancia.com.bo` y el resto del
árbol asume esa raíz, así que si el dominio elegido es otro hay que cambiar `site.ts`, `robots.txt`
y las dos URL de la OAuth App a la vez.
El cliente OAuth se despliega como segunda aplicación en Dokploy con el client ID, el secret y el
dominio permitido como variables de entorno. `config.yml` apunta a `repo`, `branch: main` y
`base_url`.

**Uso, cada vez.** Entra a `/admin/`, pulsa _Iniciar sesión con GitHub_, autoriza la aplicación la
primera vez, y la sesión queda en su navegador. Edita un formulario y guarda. Nunca ve un commit ni
una rama.

**Al guardar**, el CMS escribe desde su navegador, con su token, el YAML y la foto en un solo commit
a su nombre. El push dispara Dokploy, que reconstruye. Uno o dos minutos después el sitio está
arriba. Si el perfume era nuevo, su ruta y su entrada en el sitemap existen sin intervención,
porque `getPrerenderParams` y el generador del sitemap leen la misma fuente.

**Por qué hace falta el proxy.** GitHub exige el client secret para canjear el código por un token,
y una página estática no puede guardar un secreto. El proxy existe para ese único intercambio: no
guarda usuarios ni tiene base de datos.

**Revocar el acceso** es quitarlo de colaboradores del repositorio.

**No hay entorno de pruebas.** El CMS escribe directo a `main` y `main` es lo que se despliega. Se
acepta a conciencia: para un usuario, una rama intermedia es ceremonia. El seguro no es un staging,
es que cada guardado es un commit suyo, así que **deshacer un desastre de copia es revertir un
commit**. Lo que el validador no puede juzgar —una descripción mal escrita, un precio real pero
equivocado— lo arregla el historial.

## Despliegue

Dos aplicaciones en Dokploy, ambas con autodespliegue desde GitHub, que no requiere configuración:

- `fragancia` en el dominio raíz, sirviendo `dist/fragancia/browser` como estático.
- `fragancia-auth` en `auth.<dominio>`.

El servidor estático debe servir `/admin/index.html` como archivo real y usar `404.html` para lo
desconocido. **No debe hacer fallback de SPA a `index.html`**: este sitio está prerenderizado y cada
ruta tiene su propio `index.html`.

Notificaciones de Dokploy activadas hacia el desarrollador, para enterarse de un build fallido
antes que el cliente.

## Defensa en capas

| Qué puede romperse                               | Qué lo detiene                                           |
| ------------------------------------------------ | -------------------------------------------------------- |
| Campo obligatorio vacío                          | Formulario (`required`)                                  |
| Línea o concentración mal escrita                | Formulario (`select`)                                    |
| Precio como texto, o negativo                    | Formulario (`value_type`, `min`) y generador             |
| Slug con espacios, mayúsculas o tildes           | Formulario (`pattern`) y generador                       |
| Slug duplicado en una línea                      | Generador y `catalog.spec.ts`                            |
| Slug que no coincide con el archivo              | Generador                                                |
| Clave mal escrita en el YAML                     | Generador (claves desconocidas)                          |
| `photo` apuntando a un archivo inexistente       | Generador (comprobación en disco)                        |
| Foto de 5 MB                                     | Formulario (`max_file_size`, `transformations`)          |
| Quedarse sin destacados o sin línea              | Generador (reglas entre archivos)                        |
| Meta description pasada de 160                   | Generador (mide la cadena compuesta, no `summary`)       |
| Dos fichas con el mismo slug en líneas distintas | El directorio por línea las separa                       |
| Reordenar la parrilla sin querer                 | Campo `order` con valor por defecto y orden determinista |
| Cualquier cosa que se cuele                      | El build falla y Dokploy conserva la versión anterior    |

## Tests

- `catalog.schema.spec.ts` — nuevo. Un caso por regla, en ambos sentidos: el valor válido pasa, el
  inválido produce el error esperado. Incluye las reglas entre archivos.
- `catalog.spec.ts` — se conserva tal cual. Sus aserciones siguen valiendo sobre el catálogo
  generado, y ahora son la última red bajo el generador.
- `perfume-card.spec.ts` — se amplía con el distintivo de agotado, además de los dos casos de
  `prepareExternalUrl` que ya cubre.

## Riesgos abiertos

- **La imagen concreta del cliente OAuth no está elegida.** El autenticador propio de Sveltia se
  despliega en Cloudflare Workers; para contenedor hay que fijar una alternativa compatible con
  Decap y revisarla antes de usarla, porque va a custodiar un secreto.
- **La configuración de servido estático de Dokploy no se puede verificar hasta que el servidor
  exista.** El riesgo concreto es un fallback de SPA que se trague `/admin/` o `404.html`.
- **Si Sveltia no permite deshabilitar el borrado**, hay que decidir si se acepta el riesgo o se
  documenta como norma de uso.
