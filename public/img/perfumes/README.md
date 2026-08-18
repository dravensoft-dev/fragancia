# Fotografías de producto

Deja aquí una imagen por perfume, nombrada con su `slug`:

```
public/img/perfumes/khamrah.webp
public/img/perfumes/yara.webp
```

Formato recomendado: WebP, proporción 3:4 (por ejemplo 900 × 1200), fondo ónix `#080806`.

Después declara la ruta en `src/app/catalog/perfumes.data.ts`, en el campo `photo` del
perfume correspondiente:

```ts
photo: '/img/perfumes/khamrah.webp',
```

Sin ese campo, la ficha dibuja el marcador de la marca en lugar de una imagen rota.
