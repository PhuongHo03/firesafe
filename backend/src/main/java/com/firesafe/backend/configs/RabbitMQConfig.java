package com.firesafe.backend.configs;

import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Value("${rabbitmq.queue.notification:alert.notification.queue}")
    private String notificationQueue;

    @Value("${rabbitmq.notification-queue-count:1}")
    private int notificationQueueCount;

    @Bean
    public String[] notificationQueueNames() {
        int count = normalizedNotificationQueueCount();
        String[] names = new String[count];
        for (int index = 0; index < count; index++) {
            names[index] = notificationQueueName(index);
        }
        return names;
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        return template;
    }

    private int normalizedNotificationQueueCount() {
        return Math.max(1, notificationQueueCount);
    }

    private String notificationQueueName(int index) {
        return index == 0 ? notificationQueue : notificationQueue + "." + (index + 1);
    }
}
