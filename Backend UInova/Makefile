# ================================
# 🚀 UInova Makefile
# ================================

# Variables
DOCKER_COMPOSE = docker-compose
PROJECT_NAME = uinova

# ================================
# Commands
# ================================

## Lancer tous les services (backend + mysql + prometheus + grafana)
up:
	$(DOCKER_COMPOSE) up -d

## Arrêter tous les services
down:
	$(DOCKER_COMPOSE) down

## Rebuild des images backend
rebuild:
	$(DOCKER_COMPOSE) up -d --build

## Voir les logs du backend
logs-backend:
	$(DOCKER_COMPOSE) logs -f uinova-backend

## Voir les logs MySQL
logs-db:
	$(DOCKER_COMPOSE) logs -f uinova-mysql

## Voir les logs Prometheus
logs-prometheus:
	$(DOCKER_COMPOSE) logs -f prometheus

## Voir les logs Grafana
logs-grafana:
	$(DOCKER_COMPOSE) logs -f grafana

## Appliquer les migrations Prisma
migrate:
	npx prisma migrate dev

## Générer le client Prisma
generate:
	npx prisma generate

## Se connecter au conteneur backend
sh-backend:
	$(DOCKER_COMPOSE) exec uinova-backend sh

## Se connecter au conteneur MySQL
sh-db:
	$(DOCKER_COMPOSE) exec uinova-mysql bash

## Vérifier l’état des services
status:
	$(DOCKER_COMPOSE) ps
