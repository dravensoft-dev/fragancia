# Fase 5 — dominio, OAuth y despliegue: guía de continuación

Fecha: 2026-08-18
Continúa: `docs/superpowers/plans/2026-08-18-admin-cms-implementation.md` (tareas 13 a 16)
Spec: `docs/superpowers/specs/2026-08-18-admin-cms-design.md`

Este documento existe porque el trabajo se retoma **en otro equipo**: el del cliente, con el
repositorio recién clonado y sin nada del contexto de la sesión donde se construyó. Aquí está todo
lo que hace falta saber para terminar, en el orden en que hay que hacerlo.

## Dónde quedó el trabajo

Rama `admin-cms`, doce commits sobre `main`. Las fases 1 a 4 están hechas y verificadas; la 5 no se
podía empezar porque no existían ni el dominio ni el servidor.

**Hecho y comprobado:**

- El catálogo vive en `content/`, un YAML por ficha, partido por línea. `perfumes.data.ts` ya no
  existe.
- `scripts/generate-catalog.ts` valida y emite `src/app/catalog/perfumes.generated.ts`, que es un
  producto de build: está en `.gitignore`, `.prettierignore` y los `ignores` de ESLint.
- `src/app/catalog/catalog.schema.ts` tiene las reglas como funciones puras; 51 tests en verde.
- `inStock` recorre modelo, tarjeta, ficha y JSON-LD. Un perfume agotado sale marcado y con
  `availability: OutOfStock` en el HTML prerenderizado.
- El panel está en `public/admin/`: Sveltia CMS 0.193.0 vendorizado (sha256
  `8621c5a9956734b0c13fd0ea817b5d0674471d2d295979b609ee28fffb062452`), `config.yml` con dos
  colecciones, una por línea.
- Ensayo con navegador superado en modo repositorio local: las dos colecciones cargan, `line` se
  deriva del directorio sin ser un campo, la foto se convierte a WebP en el navegador antes de
  subir, el formulario rechaza los casos malos, y el borrado funciona.
- El riesgo 3 del spec está decidido y registrado en
  `docs/superpowers/decisions/2026-08-18-record-deletion.md`: el borrado queda **habilitado**,
  contra lo que el spec suponía, por decisión del dueño del proyecto.

**Falta todo lo de esta guía**, y nada de ello se puede verificar sin servidor y sin dominio.

## Antes de tocar el equipo del cliente

**La rama es local. Si clonas el repositorio ahora, no traes nada de esto.** `git clone` te dará
`main`, que sigue en el estado anterior al CMS. Antes de moverte hay que subirla:

```bash
git push -u origin admin-cms
```

O integrarla en `main` y subir eso, que es lo que hay que hacer de todos modos antes de desplegar:
Dokploy va a construir desde `main`, y `config.yml` declara `branch: main`, así que **el panel
escribe en `main` y `main` es lo que se despliega**. Mientras el trabajo viva sólo en `admin-cms`,
el despliegue no tendría el panel.

Ojo con un efecto secundario: cada push a `main` publica la maqueta en
`dravensoft-dev.github.io/fragancia/`. Es lo esperado y está previsto — `scripts/pages-preview.ts`
duerme el SEO y ahora además borra `admin/` del artefacto, para no ofrecer un editor del repositorio
real en una URL de escaparate.

## Arrancar en el equipo del cliente

Hace falta `git` y **Bun 1.3.14 o superior** (`Bun.YAML` es nativo desde 1.3.14 y el generador lo
usa). Nada de npm, yarn ni npx en este árbol.

```bash
git clone git@github.com:dravensoft-dev/fragancia.git
cd fragancia
git checkout admin-cms          # o main, si ya se integró
bun install
bun run build                   # prebuild genera el catálogo y las hojas de Arena
bun run test
```

**Un clon recién hecho no compila hasta la primera generación**, igual que no tiene las hojas de
Arena hasta entonces: `perfumes.generated.ts` no está versionado. Los hooks `prestart`, `prebuild`,
`pretest` y `prelint` lo cubren, así que basta con lanzar cualquiera de los cuatro comandos.

Para ver el sitio y el panel en local, sin servidor ni OAuth:

```bash
bun run serve:static            # sirve dist/fragancia/browser en :4173
```

El panel en `http://localhost:4173/admin/` funciona en modo repositorio local con Chrome, Edge o
Brave — Firefox y Safari no traen la File System Access API. Es el modo con el que se hizo todo el
ensayo.

## Lo que hay que tener a mano

- **Registrador del dominio** y acceso a su panel de DNS.
- **El VPS**: IP pública y acceso `root` o `sudo` por SSH. Ubuntu 18.04–24.04, Debian 10–12,
  Fedora 40 o CentOS 8–9; **al menos 2 GB de RAM y 30 GB de disco**; puertos 80, 443 y 3000
  abiertos.
- **Cuenta de GitHub con permiso de administración** sobre `dravensoft-dev/fragancia`, para
  registrar la OAuth App y añadir al dueño como colaborador.
- **La cuenta de GitHub del dueño**, que tiene que ser colaborador con permiso de escritura.
- **Cuenta de Cloudflare**, sólo si la decisión 1 termina en el cliente OAuth oficial.

## Decisión 1 — el cliente OAuth (riesgo 1 del spec)

El spec dejó esto abierto: la imagen concreta no estaba elegida y custodia un secreto, así que hay
que fijarla y revisarla, no asumirla. Lo que ya está averiguado, contra la documentación de Sveltia:

- **PKCE queda descartado para GitHub.** La documentación dice que depende de soporte del lado de
  GitHub que todavía no se ha publicado. Era la opción que habría eliminado el proxy entero; no
  existe. Con GitLab sí, pero cambiar de forja rompería el autodespliegue de Dokploy, que es cero
  configuración precisamente con GitHub.
- **Quedan tres caminos reales**, y hay que elegir uno:

| Opción                                                                       | Qué implica                                                                                                                           | Coste                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cliente oficial `sveltia-cms-auth` en Cloudflare Workers** _(recomendado)_ | Es el cliente contra el que está escrito el CMS. El secreto vive en un secreto de Workers. Gratis a este volumen y sin mantenimiento. | Una segunda plataforma fuera de Dokploy. El dibujo del spec suponía `fragancia-auth` como contenedor propio; esto lo sustituye.                                                                                                                                                                         |
| **Cliente de terceros compatible con Decap, en contenedor en Dokploy**       | Mantiene todo en un solo sitio, como dibujaba el spec.                                                                                | Sveltia advierte que los clientes de terceros no los revisa ni mantiene. Custodia el secreto, así que hay que fijar la imagen **por digest**, leer su código, y confirmar que sólo hace el canje de código por token, sin base de datos ni telemetría, y que rechaza un origen que no sea el del sitio. |
| **Token personal en el navegador**                                           | Sin proxy y sin secreto de servidor.                                                                                                  | El dueño tendría que crear un token en GitHub y pegarlo. Es un acto técnico, no un «entrar con GitHub», y el token queda en el almacenamiento local del navegador. Contradice el objetivo de que el dueño no vea infraestructura.                                                                       |

**Recomendación:** el cliente oficial en Workers. La ventaja del contenedor era no depender de un
tercero, pero el tercero del que se dependería es justamente el no revisado; el oficial es el que
mantiene quien escribe el CMS.

Sea cual sea, la decisión se escribe en `docs/superpowers/decisions/2026-08-18-oauth-client.md`
—con lo verificado de la opción elegida— y **cambia dos cosas**: el bloque `backend` de
`public/admin/config.yml`, y si hay una o dos aplicaciones en Dokploy.

## Decisión 2 — el dominio

El árbol ya asume `https://fragancia.com.bo`. **Si el dominio comprado es ése, esta decisión no
cambia código**; si es otro, estas cuatro cosas se mueven en el mismo commit o el canonical, el
`og:*`, el sitemap, el JSON-LD y el callback de OAuth dejan de estar de acuerdo:

1. `SITE_ORIGIN` en `src/app/seo/site.ts` — de ahí derivan `SITE_IMAGE`, la metadata y el sitemap.
2. `public/robots.txt`, que trae la URL del sitemap escrita a mano.
3. `site_url` y `base_url` en `public/admin/config.yml`.
4. La _Homepage_ y el _Authorization callback URL_ de la OAuth App de GitHub.

Comprobación de que no se escapó ninguno:

```bash
grep -rn "fragancia.com.bo" --include=*.ts --include=*.txt --include=*.yml --include=*.md . \
  --exclude-dir=node_modules --exclude-dir=dist
```

Lo que salga bajo `docs/` es historia y se queda como está.

## Paso a paso

### 1. Comprar el dominio y apuntar el DNS

- Registro `A` de la raíz → IP del VPS.
- Registro `A` de `www` → la misma IP, si se quiere.
- Registro `A` de `auth` → la misma IP, **sólo si la decisión 1 fue el contenedor**. Con Cloudflare
  Workers el autenticador vive en su propio dominio `workers.dev` o en uno de Cloudflare, y no
  necesita registro aquí.

Espera a que resuelva antes de pedir certificados; un `dig fragancia.com.bo +short` que devuelva la
IP es la señal.

### 2. Instalar Dokploy en el VPS

Requisitos y comando, de la documentación oficial:

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Instala Docker si falta y levanta Dokploy. Después, el panel está en `http://<IP-del-VPS>:3000`, con
una página de configuración inicial para crear la cuenta de administrador. **Crea esa cuenta de
inmediato**: hasta que exista, cualquiera que llegue al puerto 3000 puede crearla.

Antes de cerrar el acceso por IP y puerto, configura primero el dominio y HTTPS del propio Dokploy,
o te quedas fuera de tu instalación.

Como el comando es un `curl | sh`, léelo antes si el cliente tiene política sobre eso:
`curl -sSL https://dokploy.com/install.sh | less`.

### 3. La aplicación del sitio

Aplicación `fragancia`, origen GitHub `dravensoft-dev/fragancia`, rama `main`, autodespliegue
activado.

- **Construcción:** `bun install && bun run build`. **Comprueba que el constructor tiene Bun**: si
  el buildpack por defecto no lo trae, la salida fallará en el primer comando. La alternativa es un
  `Dockerfile` con la imagen `oven/bun`, que copia el repositorio, instala y construye. Decídelo en
  el primer despliegue, no antes.
- **Publicación:** servir `dist/fragancia/browser` como estático, con el dominio raíz y TLS.
- `postbuild` ya deja `404.html` en la raíz del artefacto.

### 4. El servido estático, que no debe ser un servidor de SPA (riesgo 2 del spec)

Es el riesgo que no se podía verificar sin servidor, y el que hay que mirar con más cuidado. Este
sitio está prerenderizado: **cada ruta tiene su propio `index.html`**. Un servidor que reescriba
todo a la raíz rompe la página de no encontrado, puede tapar `/admin/`, y convierte cada URL
inexistente en un 200 que Google indexará.

Lo que debe hacer: servir el archivo real, luego `index.html` del directorio, y `404.html` para lo
desconocido, con código 404. En nginx eso es
`try_files $uri $uri/index.html =404;` con `error_page 404 /404.html;`.

Pregúntaselo al servidor ya desplegado:

```bash
curl -sI https://<dominio>/ | head -1                                  # 200
curl -sI https://<dominio>/perfumes/mujer/yara/ | head -1              # 200
curl -s  https://<dominio>/perfumes/mujer/yara/ | grep -c 'schema.org/InStock'   # 1
curl -sI https://<dominio>/admin/ | head -1                            # 200
curl -s  https://<dominio>/admin/ | grep -c 'sveltia-cms.js'           # 1
curl -sI https://<dominio>/sitemap.xml | head -1                       # 200
curl -sI https://<dominio>/robots.txt | head -1                        # 200
curl -sI https://<dominio>/no-existe | head -1                         # 404
curl -s  https://<dominio>/no-existe | grep -c 'Página no encontrada'   # 1
```

El `1` de `schema.org/InStock` es la prueba de que llega la página prerenderizada y no una cáscara.
Un `200` en `/no-existe` es el fallback de SPA, y es un defecto que se corrige en la configuración
del servidor, no algo que se acepte. Si la plataforma no deja quitarlo, la salida es un contenedor
nginx pequeño sirviendo el mismo directorio con las dos directivas de arriba.

Escribe lo que resulte en `docs/superpowers/decisions/2026-08-18-static-serving.md`, con la salida
de los `curl` como evidencia.

### 5. La autenticación

1. Registra la **OAuth App** en GitHub con la _Homepage_ en el dominio y el _callback_ que pida el
   cliente elegido en la decisión 1.
2. Despliega el cliente OAuth: en Cloudflare Workers con su secreto, o como segunda aplicación
   `fragancia-auth` en Dokploy con el client ID, el secret y el origen permitido como variables de
   entorno. **El secreto vive sólo ahí**: nunca en el repositorio, nunca en `config.yml`, nunca en
   el bundle del panel.
3. Ajusta `backend.base_url` en `public/admin/config.yml` a la URL del cliente, commitea y deja que
   se despliegue.
4. Añade al dueño como **colaborador con permiso de escritura** en el repositorio.

Revocar el acceso más adelante es quitarlo de colaboradores, y nada más.

### 6. Notificaciones

Activa las notificaciones de Dokploy hacia el desarrollador para builds fallidos. Son la única
manera de enterarse de que un guardado del dueño no llegó: el sitio no se rompe —sigue sirviendo la
versión anterior— y por eso el fallo es silencioso para él.

### 7. Entrega al dueño

- Su primer guardado, acompañado: entrar a `/admin/`, autorizar la aplicación una vez, cambiar un
  precio, guardar, y ver el cambio arriba en un minuto o dos. Nunca ve un commit.
- Su primera ficha nueva con una foto del móvil, para comprobar la conversión a WebP y que la ruta
  y el sitemap aparecen solos.
- El ensayo que nadie quiere hacer en frío: revertir un commit y ver el sitio volver; y quitar y
  devolver al dueño de colaboradores para comprobar que la revocación funciona.
- La norma de uso, en una frase: **retirar un perfume que se agotó es marcarlo como no disponible,
  no borrarlo.** Borrar convierte en 404 una dirección que Google puede tener indexada.

## Cuando me llames, empieza por esto

Pégame la salida de estos cuatro, y sé dónde estamos sin preguntarte nada:

```bash
git log --oneline -5
git status --short
bun run build 2>&1 | tail -3
grep -n "base_url\|site_url\|repo:" public/admin/config.yml
```

## Lo que sigue abierto al terminar esta guía

- Precios variables, stock numérico, carrito, pedidos, más de un usuario y roles siguen fuera de
  alcance. Cuando aparezca un carrito, la conversación sobre un backend de verdad se reabre; es lo
  que el spec dejó dicho.
- El formulario y el validador se reflejan a mano. Si algún día divergen, el build sigue rechazando
  el registro malo: el formulario es la primera línea de defensa, no la única.
