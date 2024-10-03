use std::{sync::Arc, time::Duration};

use async_trait::async_trait;
use reqwest::Client;
use scraper::{Html, Selector};
use serde::Serialize;

use crate::{
    error::AppError,
    models::{ScrapeParams, WebSocketMessage},
    services::{AIService, WebSocketService},
};

#[async_trait]
pub trait Spider: Send + Sync {
    type Item: Serialize;
    type Error;

    fn name(&self) -> String;
    fn start_urls(&self) -> Vec<String>;
    async fn scrape(&self, url: String) -> Result<(Vec<Self::Item>, Vec<String>), Self::Error>;
    async fn process(&self, item: Self::Item) -> Result<(), Self::Error>;
}

pub struct GenericSpider {
    http_client: Client,
    selectors: Vec<Selector>,
    websocket_service: Arc<WebSocketService>,
    ai_service: AIService,
    scrape_params: ScrapeParams,
}

impl GenericSpider {
    pub fn new(
        selectors: Vec<&str>,
        websocket_service: Arc<WebSocketService>,
        scrape_params: ScrapeParams,
    ) -> Result<Self, AppError> {
        let http_timeout = Duration::from_secs(6);
        let http_client = Client::builder()
            .timeout(http_timeout)
            .build()
            .expect("spiders/general: Building HTTP client");

        let selectors = selectors
            .into_iter()
            .map(|s| Selector::parse(s).unwrap())
            .collect();

        let ai_service = AIService::new(&scrape_params.api_key, websocket_service.clone())?;

        Ok(Self {
            http_client,
            selectors,
            websocket_service,
            ai_service,
            scrape_params,
        })
    }
}

#[async_trait]
impl Spider for GenericSpider {
    type Item = String;
    type Error = AppError;

    fn name(&self) -> String {
        String::from("generic")
    }

    fn start_urls(&self) -> Vec<String> {
        vec![self.scrape_params.url.clone()]
    }

    async fn scrape(&self, url: String) -> Result<(Vec<Self::Item>, Vec<String>), Self::Error> {
        let res = self.http_client.get(&url).send().await?;
        let html = res.text().await?;
        let document = Html::parse_document(&html);

        let mut items = Vec::new();

        for selector in &self.selectors {
            for element in document.select(selector) {
                items.push(element.inner_html());
            }
        }

        Ok((items, vec![]))
    }

    async fn process(&self, item: Self::Item) -> Result<(), Self::Error> {
        self.websocket_service
            .send_message(WebSocketMessage::raw(&item))
            .await?;

        if self.scrape_params.enable_scraping {
            self.ai_service
                .extract_items(&item, &self.scrape_params)
                .await?;
        }

        Ok(())
    }
}
