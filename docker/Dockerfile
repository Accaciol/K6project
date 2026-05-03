# Dockerfile com suporte REAL a Oracle
FROM golang:alpine AS builder
RUN apk add --no-cache git build-base
RUN go install go.k6.io/xk6/cmd/xk6@latest

# Usando a extensão SQL oficial da Grafana e o driver Oracle de terceiros
RUN xk6 build --with github.com/grafana/xk6-sql \
    --with github.com/denyshuzovskyi/xk6-sql-driver-oracle

FROM alpine:latest
RUN apk add --no-cache ca-certificates
COPY --from=builder /go/k6 /usr/bin/k6
WORKDIR /scripts
ENTRYPOINT ["k6"]
