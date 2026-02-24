import { test, expect } from '@playwright/test';

test.describe('TicketHub E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('homepage loads correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/TRIP|TicketHub/);
    await expect(page.locator('.hero-title')).toBeVisible();
  });

  test('can navigate to events page', async ({ page }) => {
    await page.click('text=Événements');
    await expect(page).toHaveURL(/\/events/);
    await expect(page.locator('.page-title')).toContainText('Tous les événements');
  });

  test('search events works', async ({ page }) => {
    await page.fill('.search-input', 'Rock');
    await page.press('.search-input', 'Enter');
    await expect(page).toHaveURL(/search=Rock/);
  });

  test('registration flow works', async ({ page }) => {
    const randomEmail = `test${Date.now()}@example.com`;
    
    await page.click('text=Inscription');
    await page.fill('input[type="text"]', 'Test User');
    await page.fill('input[type="email"]', randomEmail);
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]:has-text("S\'inscrire")');
    
    await expect(page).toHaveURL('/');
    await expect(page.locator('.user-name')).toContainText('Test User');
  });

  test('login flow works', async ({ page }) => {
    await page.click('text=Connexion');
    await page.fill('input[type="email"]', 'admin@ticket.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]:has-text("Se connecter")');
    
    await expect(page).toHaveURL('/');
    await expect(page.locator('.user-name')).toContainText('Admin');
  });

  test('can view event details', async ({ page }) => {
    await page.click('.featured-card, .event-card');
    await expect(page.locator('.event-detail-title')).toBeVisible();
    await expect(page.locator('.price-value')).toBeVisible();
  });

  test('can purchase ticket (mock)', async ({ page }) => {
    await page.click('text=Connexion');
    await page.fill('input[type="email"]', 'admin@ticket.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]:has-text("Se connecter")');
    await expect(page).toHaveURL('/');
    
    await page.click('.featured-card, .event-card');
    await page.click('button:has-text("Réserver")');
    
    await expect(page.locator('.success-card')).toBeVisible({ timeout: 10000 });
  });

  test('admin can access admin panel', async ({ page }) => {
    await page.click('text=Connexion');
    await page.fill('input[type="email"]', 'admin@ticket.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]:has-text("Se connecter")');
    
    await page.click('text=Admin');
    await expect(page.locator('.admin-tabs')).toBeVisible();
  });
});
