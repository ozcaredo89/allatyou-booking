import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || !(file instanceof Blob)) {
            return NextResponse.json(
                { error: 'No se envió ningún archivo válido' },
                { status: 400 }
            );
        }

        const endpoint = process.env.R2_ENDPOINT;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        const bucketName = process.env.R2_BUCKET_NAME;
        const publicUrl = process.env.R2_PUBLIC_URL;

        if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
            console.error("Faltan variables de entorno de Cloudflare R2");
            return NextResponse.json(
                { error: 'Configuración de servidor incompleta (Cloudflare R2)' },
                { status: 500 }
            );
        }

        // Configurar cliente S3 apuntando a Cloudflare R2
        const S3 = new S3Client({
            region: 'auto',
            endpoint: endpoint,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
            },
            // Cloudflare R2 requiere S3 virtual host style
            forcePathStyle: true,
        });

        // Leer el archivo como ArrayBuffer y luego a Buffer puro
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Generar un nombre único para el archivo
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const randomString = Math.random().toString(36).substring(2, 8);
        // Asumimos que es una imagen, mantenemos la extensión si es posible, o usamos .jpg por defecto.
        const originalName = (file as any).name || 'image.jpg';
        const extension = originalName.split('.').pop();
        const fileName = `client_works/img_${timestamp}_${randomString}.${extension}`;

        // Parámetros para subir el objeto a R2
        const uploadParams = {
            Bucket: bucketName,
            Key: fileName,
            Body: buffer,
            ContentType: file.type || 'image/jpeg',
        };

        // Subir el archivo
        await S3.send(new PutObjectCommand(uploadParams));

        // Construir la URL final basándonos en tu R2_PUBLIC_URL configurada en el Dashboard de Cloudflare
        // Asegurarse de que no haya doble barra accidental
        const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
        const fileUrl = `${cleanPublicUrl}/${fileName}`;

        return NextResponse.json({ url: fileUrl, success: true });

    } catch (error) {
        console.error('Error interno de subida R2:', error);
        return NextResponse.json(
            { error: 'Ocurrió un error inesperado al procesar la imagen' },
            { status: 500 }
        );
    }
}
