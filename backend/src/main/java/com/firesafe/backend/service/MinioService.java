package com.firesafe.backend.service;

import io.minio.*;
import io.minio.http.Method;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class MinioService {

    private final MinioClient minioClient;
    private final String bucket;

    public MinioService(
            @Value("${minio.endpoint}") String endpoint,
            @Value("${minio.access-key}") String accessKey,
            @Value("${minio.secret-key}") String secretKey,
            @Value("${minio.bucket}") String bucket) {
        this.bucket = bucket;
        this.minioClient = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }

    @PostConstruct
    public void ensureBucketExists() {
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("Created MinIO bucket: {}", bucket);
            }
        } catch (Exception e) {
            log.error("Failed to ensure MinIO bucket '{}' exists: {}", bucket, e.getMessage());
        }
    }

    /**
     * Upload file lên MinIO.
     *
     * @param objectName đường dẫn trong bucket, ví dụ: "cam-001/2026-04-22T10-30-00.jpg"
     * @param inputStream nội dung file
     * @param contentType MIME type, ví dụ: "image/jpeg"
     * @return URL trực tiếp đến object (không có auth)
     */
    public String upload(String objectName, InputStream inputStream, String contentType, long size) {
        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .stream(inputStream, size, -1)
                    .contentType(contentType)
                    .build());
            String url = minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .method(Method.GET)
                    .expiry(7, TimeUnit.DAYS)
                    .build());
            log.info("Uploaded to MinIO: {}", objectName);
            return url;
        } catch (Exception e) {
            throw new RuntimeException("MinIO upload failed for object: " + objectName, e);
        }
    }

    /**
     * Upload từ MultipartFile (dùng cho REST endpoint nếu cần).
     */
    public String uploadMultipart(String objectName, MultipartFile file) {
        try (InputStream is = file.getInputStream()) {
            return upload(objectName, is, file.getContentType(), file.getSize());
        } catch (Exception e) {
            throw new RuntimeException("MinIO upload failed for: " + objectName, e);
        }
    }

    /**
     * Tạo pre-signed URL có thời hạn cho object đã tồn tại.
     *
     * @param objectName đường dẫn trong bucket
     * @param expiryHours thời hạn URL (giờ)
     */
    public String getPresignedUrl(String objectName, int expiryHours) {
        try {
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .method(Method.GET)
                    .expiry(expiryHours, TimeUnit.HOURS)
                    .build());
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate pre-signed URL for: " + objectName, e);
        }
    }
}
