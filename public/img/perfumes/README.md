# Fotografías de producto

Deja aquí una imagen por perfume, nombrada con su `slug`:

```
public/img/perfumes/khamrah.webp
public/img/perfumes/yara.webp
```

Formato recomendado: WebP, proporción 3:4 (por ejemplo 900 × 1200), fondo ónix `#080806`.

Si subes la foto desde `/admin`, el panel la deja aquí ya convertida a WebP y escribe la ruta
sola. A mano, declárala en el campo `photo` del archivo del perfume, en
`content/perfumes/<línea>/<slug>.yml`:

```yaml
photo: '/img/perfumes/khamrah.webp'
```

La ruta tiene que existir en disco: el generador del catálogo comprueba el archivo y falla la
compilación si no está.

Sin ese campo, la ficha dibuja el marcador de la marca en lugar de una imagen rota.
