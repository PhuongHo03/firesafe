package com.firesafe.backend.configs;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class RabbitMQConfig {

    @Value("${rabbitmq.exchange:alert.exchange}")
    private String exchange;

    @Value("${rabbitmq.queue.notification:alert.notification.queue}")
    private String notificationQueue;

    @Value("${rabbitmq.routing-key.notification:alert.notification}")
    private String notificationRoutingKey;

    @Value("${rabbitmq.notification-queue-count:1}")
    private int notificationQueueCount;

    @Bean
    public DirectExchange alertExchange() {
        return new DirectExchange(exchange, true, false);
    }

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
    public Declarables notificationQueueDeclarables() {
        List<Declarable> declarables = new ArrayList<>();
        DirectExchange exchange = alertExchange();
        for (int index = 0; index < normalizedNotificationQueueCount(); index++) {
            Queue queue = QueueBuilder.durable(notificationQueueName(index)).build();
            declarables.add(queue);
            declarables.add(BindingBuilder
                    .bind(queue)
                    .to(exchange)
                    .with(notificationRoutingKey(index)));
        }
        return new Declarables(declarables);
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

    private String notificationRoutingKey(int index) {
        return index == 0 ? notificationRoutingKey : notificationRoutingKey + "." + (index + 1);
    }
}
