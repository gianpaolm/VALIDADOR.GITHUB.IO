# Validador de Session ID

App web para el equipo de CX. Toma la URL del flujo o el mensaje de error,
devuelve el ID de sesión y frena los que van a rebotar en el equipo de bugs.

Funciona en el teléfono, se instala en la pantalla de inicio y anda sin señal.

## Publicar

Es un sitio estático: no tiene build, ni dependencias, ni backend.

### Vercel

1. Subí esta carpeta a un repo de GitHub.
2. En Vercel, "Add New Project" e importá el repo.
3. Framework preset: Other. Build command: vacío. Output directory: vacío.
4. Deploy.

### GitHub Pages

1. Subí esta carpeta a un repo.
2. Settings → Pages → Source: Deploy from a branch → `main` / `root`.
3. Queda en `https://usuario.github.io/repo/`.

Las rutas son relativas, así que funciona igual en la raíz de un dominio o en
un subdirectorio.

## Instalar en el teléfono

- **Android**: abrir la URL en Chrome, menú, "Instalar aplicación".
- **iPhone**: abrir en Safari, compartir, "Agregar a inicio".

Queda con ícono propio, a pantalla completa y sin barra del navegador. El
service worker guarda la app, así que abre aunque no haya señal.

## Secciones

**Validar.** Pegás la URL o el mensaje de error y devuelve verde, amarillo o
rojo. Debajo, la anatomía del ID: usuario, flujo y token, cada parte con su
propio estado. El token trae un medidor de 12 puntos, uno por carácter, así
se ve de un vistazo si está cortado. El botón de compartir abre el menú
nativo del teléfono para mandarlo a Slack o al CRM.

**Flujos.** Los siete flujos conocidos, separados en publicar, modificar y
clasificados, con el formato del ID y la cola a la que deriva cada uno.
Abajo, cómo copiarlo sin que rebote.

**Historial.** Los últimos veinte casos con su estado y hora, y el bloque
listo para volver a copiar. El globo amarillo de la barra cuenta los que
quedaron para revisar.

## Qué valida

Un ID de sesión se compone de tres partes: `usuario-flujo-token`.

- Usuario: hasta 10 dígitos.
- Flujo: `list_omnichannel`, `list_equals-omni`, `list_similar-omni`,
  `update_omni`, y los de clasificados `listmot`, `listres`, `listsrv`.
- Token: 12 caracteres hexadecimales.

El error más frecuente hasta ahora fue pegar solo el token. La app lo detecta
y muestra cómo tendría que verse el ID completo.

## Pendiente

Los flujos de modificación con `bomni/variation` traen un identificador de 4
o 5 caracteres en la URL, no de 12. Falta confirmar si ese segmento es el
session id de ese flujo o si el bueno está en el snackbar. Hasta saberlo, la
app los marca en amarillo en vez de rechazarlos.

Tampoco está definida la ruta de derivación de `update_omni` en el material
del área.

## Mantener

Los flujos están en la constante `FLUJOS`, arriba de `app.js`. Se agrega una
línea con el nombre, la categoría, un ejemplo y la cola de derivación.

Al publicar una versión nueva, subí el número de `VERSION` en `sw.js`. Sin
eso, los teléfonos que ya tienen la app cacheada siguen con la anterior.
