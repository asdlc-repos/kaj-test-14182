# --- Build Stage ---
FROM golang:1.22-alpine AS builder

# Install gcc and musl-dev for CGO (required by go-sqlite3).
RUN apk add --no-cache gcc musl-dev

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=1 GOOS=linux go build -o /app/server .

# --- Final Stage ---
FROM alpine:3.19

RUN mkdir -p /data

WORKDIR /app

COPY --from=builder /app/server .

EXPOSE 9090

CMD ["/app/server"]
