#!/bin/sh

BOOTSTRAP_SERVER="kafka:9092"

echo "Waiting for Kafka to be ready at $BOOTSTRAP_SERVER..."

# Wait for the broker to actually accept connections
until kafka-broker-api-versions --bootstrap-server $BOOTSTRAP_SERVER >/dev/null 2>&1; do
    echo "Waiting..."
    sleep 5
done

# List of topics to create
TOPICS=(
    "order.created" 
    "order.confirmed" 
    "order.cancelled" 
    "inventory.reservation.succeeded" 
    "inventory.reservation.failed" 
    "inventory.commands.reserve"
)

# echo "Creating topics..."
# for topic in "${TOPICS[@]}"; do
#     kafka-topics --create --if-not-exists --bootstrap-server kafka:9092 --topic "$topic" --partitions 3 --replication-factor 1
# done

echo "Creating topics..."
for topic in "${TOPICS[@]}"; do
    kafka-topics --create --if-not-exists \
        --bootstrap-server $BOOTSTRAP_SERVER \
        --topic "$topic" \
        --partitions 3 \
        --replication-factor 1
done

echo "Topics created successfully."
