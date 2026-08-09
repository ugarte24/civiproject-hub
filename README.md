# Civil Project Hub

PRD (Product Requirements Document)

Sistema Web de Gestión y Control de Proyectos Civiles (SIGOC)

Versión: 1.0
Fecha: Agosto 2026

1. Descripción General

Nombre del sistema

SIGOC (Sistema de Gestión de Proyectos Civiles)

Descripción

SIGOC es una aplicación web diseñada para administrar y controlar proyectos de construcción de manera centralizada. Permitirá registrar información técnica, económica y administrativa de cada proyecto, almacenar documentos, controlar presupuestos, realizar seguimiento al avance físico y financiero y gestionar los usuarios mediante permisos por roles.

El sistema será accesible desde computadoras, tablets y teléfonos móviles, permitiendo que ingenieros, administradores, supervisores y personal de contabilidad trabajen sobre una misma plataforma con acceso únicamente a la información autorizada.

2. Objetivo

Desarrollar un sistema web que optimice la gestión de proyectos civiles mediante la digitalización de documentos, el control financiero, el seguimiento del avance de obra y la generación de reportes en tiempo real.

3. Objetivos específicos

 Centralizar toda la información del proyecto.

 Controlar el presupuesto y la ejecución financiera.

 Digitalizar documentos técnicos.

 Almacenar fotografías del avance.

 Gestionar usuarios por roles.

 Generar reportes automáticos.

 Reducir el uso de documentos físicos.

4. Usuarios

Administrador

Tiene acceso completo al sistema.

Puede

 Crear proyectos.

 Crear usuarios.

 Asignar permisos.

 Configurar el sistema.

 Ver todos los reportes.

Ingeniero Residente

Puede

 Registrar avance.

 Subir fotografías.

 Registrar APU.

 Registrar planillas.

 Registrar informes.

Supervisor

Puede

 Ver proyectos.

 Aprobar informes.

 Registrar observaciones.

 Subir fotografías.

Contabilidad

Solo puede acceder a la información económica.

Puede

 Registrar pagos.

 Subir facturas.

 Registrar egresos.

 Ver presupuesto.

 Ver reportes financieros.

No puede acceder a

 Planos.

 APU.

 Memorias de cálculo.

 Documentación técnica.

Consulta

Solo lectura.

5. Dashboard Principal

Al ingresar al sistema se visualizará un panel moderno con tarjetas estadísticas.

Indicadores

 Total de proyectos

 Proyectos activos

 Presupuesto total

 Presupuesto ejecutado

 Saldo disponible

 Avance físico

 Avance financiero

 Próximos vencimientos

Además tendrá

 Gráfico de presupuesto

 Gráfico de avance

 Actividad reciente

 Calendario

6. Menú lateral

Dashboard

Proyectos

Presupuesto

Contabilidad

Documentos

Fotografías

Cronograma

APU

Reportes

Usuarios

Configuración

7. Gestión de Proyectos

Lista

Mostrará

✔ Código

✔ Nombre

✔ Empresa

✔ Responsable

✔ Fecha Inicio

✔ Fecha Final

✔ Estado

✔ Presupuesto

✔ Acciones

Botones

Editar

Eliminar

Ver

Documentos

Fotografías

Botón Nuevo Proyecto

IMPORTANTE

Al presionar "Nuevo Proyecto", NO se cambiará de página.

Se abrirá una VENTANA EMERGENTE (Modal) centrada sobre la pantalla con fondo oscurecido.

Diseño del Modal

+------------------------------------------------------+
|               NUEVO PROYECTO                     X    |
+------------------------------------------------------+

Código

[______________]

Nombre

[____________________________________________]

Entidad

[____________________________________________]

Empresa Contratista

[____________________________________________]

Ingeniero Responsable

[____________________________________________]

Presupuesto

[______________]

Fecha Inicio

[_____/_____/______]

Fecha Final

[_____/_____/______]

Estado

( ) Activo

( ) Suspendido

( ) Finalizado

------------------------------------------------------

[ Cancelar ]

                     [ Guardar Proyecto ]

Características

✔ Cierre con X

✔ Cierre haciendo clic fuera

✔ Animación Fade

✔ Animación Scale

✔ Validación inmediata

✔ Responsive

8. Presupuesto

Cada proyecto tendrá partidas.

Ejemplo

Excavación

Hormigón

Acero

Pavimento

Mano de obra

Materiales

Equipos

Botón

Nueva Partida

Se abrirá un Modal.

+--------------------------------------+

NUEVA PARTIDA

Nombre

Monto

Descripción

[Cancelar]

[Guardar]

+--------------------------------------+

9. Contabilidad

Solo visible para usuarios con rol Contabilidad.

Opciones

Ingresos

Egresos

Facturas

Pagos

Planillas

Nueva Factura

Se abrirá un Modal.

+--------------------------------------------------+

REGISTRAR FACTURA

Proveedor

NIT

Número

Monto

Fecha

Adjuntar PDF

Adjuntar Imagen

Observación

[Cancelar]

[Guardar]

+--------------------------------------------------+

10. Documentos

Permitirá subir

 PDF

 Word

 Excel

 DWG

 ZIP

Categorías

Planos

Contratos

Memorias

Licitaciones

Informes

APU

Actas

Subir Documento

Modal

Documento

Categoría

Proyecto

Archivo

Descripción

[Cancelar]

[Guardar]

11. Fotografías

Cada fotografía tendrá

Proyecto

Fecha

Descripción

Ubicación

Autor

Imagen

Nueva Fotografía

Modal

Proyecto

Fecha

Descripción

Seleccionar Imagen

Vista previa

[Cancelar]

[Guardar]

12. Módulo APU

Análisis de precios unitarios.

Cada APU contendrá

Código

Descripción

Unidad

Cantidad

Materiales

Equipos

Mano de Obra

Costo Directo

Costo Indirecto

Utilidad

Precio Unitario

Nuevo APU

Modal de gran tamaño

Con pestañas

General

Materiales

Equipos

Mano de obra

Resumen

13. Cronograma

Vista tipo Gantt

Actividades

Inicio

Fin

Duración

Responsable

Estado

14. Reportes

PDF

Excel

Filtros

Proyecto

Fecha

Empresa

Responsable

Estado

15. Gestión de Usuarios

Lista

Nuevo Usuario

Editar

Eliminar

Roles

Administrador

Ingeniero

Supervisor

Contabilidad

Consulta

Nuevo Usuario

Modal

Nombre

Correo

Teléfono

Contraseña

Rol

Estado

[Cancelar]

[Guardar]

16. Configuración

Empresa

Logo

Colores

Respaldos

Notificaciones

Parámetros

17. Notificaciones

El sistema mostrará ventanas emergentes (toast) para informar el resultado de las operaciones.

Ejemplos:

 ✅ Proyecto registrado correctamente.

 ✏️ Proyecto actualizado correctamente.

 🗑️ Proyecto eliminado correctamente.

 📄 Documento cargado correctamente.

 📷 Fotografía subida correctamente.

 ❌ Error al guardar los datos.

Las notificaciones aparecerán en la esquina superior derecha y desaparecerán automáticamente después de unos segundos.
EL DISEÑO QUE SEA PROFESIONAL

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0dd430e0-34f4-401f-9e97-aa31fd262551).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
