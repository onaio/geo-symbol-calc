import { test, expect } from '@playwright/test';
import { createdConfig1 } from './fixtureData/index.ts';

test('test', async ({ page }) => {
	await page.goto('/');

	// Click #navbarNav >> text=Create Config
	await page.locator('#navbarNav >> text=Create Config').click();
	await expect(page).toHaveURL('http://localhost:4173/configs');

	// Click text=Create Symbology configs form
	await page.locator('text=Create Symbology configs form');

	/** test form validation */
	await page.locator('text=Save Configuration').click();
	// Click text=Geo point registration form is required
	await page.locator('text=Geo point registration form is required').click();
	// Click text=Visit form field is required
	await page.locator('text=Visit form field is required').click();
	// Click text=Base Url is required
	await page.locator('text=Base Url is required').click();
	// Click text=Schedule is not valid cron syntax
	await page.locator('text=Schedule is not valid cron syntax').click();
	// Click text=Over flow days is required
	await page.locator('text=Over flow days is required').click();
	// Click text=Color code is required.
	await page.locator('text=Color code is required.').click();

	// Click input[name="formPair\.regFormId"]
	await page.locator('input[name="formPair\\.regFormId"]');

	// Fill input[name="formPair\.regFormId"]
	await page.locator('input[name="formPair\\.regFormId"]').fill('01');

	// Click input[name="formPair\.visitFormId"]
	await page.locator('input[name="formPair\\.visitFormId"]').click();

	// Fill input[name="formPair\.visitFormId"]
	await page.locator('input[name="formPair\\.visitFormId"]').fill('02');

	// Click input[name="baseUrl"]
	await page.locator('input[name="baseUrl"]').click();

	// Fill input[name="baseUrl"]
	await page.locator('input[name="baseUrl"]').fill('https://stage-api.ona.io');

	// Click input[name="schedule"]
	await page.locator('input[name="schedule"]').click();

	// Fill input[name="schedule"]
	await page.locator('input[name="schedule"]').fill('*/5 * * * *');

	// Click input[name="symbolConfig[0].frequency"]
	await page.locator('input[name="symbolConfig[0].frequency"]').click();

	// Fill input[name="symbolConfig0\.frequency"]
	await page.locator('input[name="symbolConfig[0].frequency"]').fill('3');

	// Click input[name="symbolConfig\[0\]\.symbologyOnOverflow\[0\]\.overFlowDays"]
	await page
		.locator('input[name="symbolConfig\\[0\\]\\.symbologyOnOverflow\\[0\\]\\.overFlowDays"]')
		.click();

	// Fill input[name="symbolConfig\[0\]\.symbologyOnOverflow\[0\]\.overFlowDays"]
	await page
		.locator('input[name="symbolConfig\\[0\\]\\.symbologyOnOverflow\\[0\\]\\.overFlowDays"]')
		.fill('1');

	// Click input[name="symbolConfig\[0\]\.symbologyOnOverflow\[0\]\.color"]
	await page
		.locator('input[name="symbolConfig\\[0\\]\\.symbologyOnOverflow\\[0\\]\\.color"]')
		.click();

	// Click input[name="symbolConfig\[0\]\.symbologyOnOverflow\[0\]\.color"]
	await page
		.locator('input[name="symbolConfig\\[0\\]\\.symbologyOnOverflow\\[0\\]\\.color"]')
		.click();

	// Fill input[name="symbolConfig\[0\]\.symbologyOnOverflow\[0\]\.color"]
	await page
		.locator('input[name="symbolConfig\\[0\\]\\.symbologyOnOverflow\\[0\\]\\.color"]')
		.fill('#1eff00');

	// Click #symbol-configs >> text=+
	await page.locator('#symbol-configs >> text=+').click();

	// Click input[name="symbolConfig\[0\]\.symbologyOnOverflow\[1\]\.overFlowDays"]
	await page
		.locator('input[name="symbolConfig\\[0\\]\\.symbologyOnOverflow\\[1\\]\\.overFlowDays"]')
		.click();

	// Fill input[name="symbolConfig\[0\]\.symbologyOnOverflow\[1\]\.overFlowDays"]
	await page
		.locator('input[name="symbolConfig\\[0\\]\\.symbologyOnOverflow\\[1\\]\\.overFlowDays"]')
		.fill('3');

	// Click input[name="symbolConfig\[0\]\.symbologyOnOverflow\[1\]\.color"]
	await page
		.locator('input[name="symbolConfig\\[0\\]\\.symbologyOnOverflow\\[1\\]\\.color"]')
		.click();

	// Fill input[name="symbolConfig\[0\]\.symbologyOnOverflow\[1\]\.color"]
	await page
		.locator('input[name="symbolConfig\\[0\\]\\.symbologyOnOverflow\\[1\\]\\.color"]')
		.fill('#fcdb03');

	// Click text=+ Add another priority level
	await page.locator('text=+ Add another priority level').click();

	// Select Medium
	await page.locator('select[name="symbolConfig[1].priorityLevel"]').selectOption('Medium');

	// Click input[name="symbolConfig1\.frequency"]
	await page.locator('input[name="symbolConfig[1].frequency"]').click();

	// Fill input[name="symbolConfig1\.frequency"]
	await page.locator('input[name="symbolConfig[1].frequency"]').fill('2');

	// Click input[name="symbolConfig\[1\]\.symbologyOnOverflow\[0\]\.overFlowDays"]
	await page
		.locator('input[name="symbolConfig\\[1\\]\\.symbologyOnOverflow\\[0\\]\\.overFlowDays"]')
		.click();

	// Click div:nth-child(2) > div:nth-child(2) > div:nth-child(2) > .col-sm-9
	await page.locator('div:nth-child(2) > div:nth-child(2) > div:nth-child(2) > .col-sm-9').click();

	// Fill input[name="symbolConfig1\.frequency"]
	await page.locator('input[name="symbolConfig[1].frequency"]').fill('10');

	// Click input[name="symbolConfig\[1\]\.symbologyOnOverflow\[0\]\.overFlowDays"]
	await page
		.locator('input[name="symbolConfig\\[1\\]\\.symbologyOnOverflow\\[0\\]\\.overFlowDays"]')
		.click();

	// Fill input[name="symbolConfig\[1\]\.symbologyOnOverflow\[0\]\.overFlowDays"]
	await page
		.locator('input[name="symbolConfig\\[1\\]\\.symbologyOnOverflow\\[0\\]\\.overFlowDays"]')
		.fill('0');

	// Click input[name="symbolConfig\[1\]\.symbologyOnOverflow\[0\]\.color"]
	await page
		.locator('input[name="symbolConfig\\[1\\]\\.symbologyOnOverflow\\[0\\]\\.color"]')
		.click();

	/** whats the generated geojson */
	const pre = await page.locator('pre');
	const textContent = await pre.innerText();
	expect(JSON.parse(textContent)).toMatchObject({ ...createdConfig1, uuid: expect.any(String) });

	// Click text=Generate Json
	await page.locator('text=Save configuration').click();

	// // Click text=Copy Config
	// page.once('dialog', (dialog) => {
	// 	console.log(`Dialog message: ${dialog.message()}`);
	// 	expect(dialog.message).toEqual("");
	// 	dialog.dismiss().catch(() => {
	// 		return;
	// 	});
	// });

	await page.goto('/');

	// Click #navbarNav >> text=Workflows
	await page.locator('#navbarNav >> text=Workflows').click();
	await expect(page).toHaveURL('http://localhost:4173/workflows');

	// Click text=Configured Pipeline list
	await page.locator('text=Configured Pipeline list').click();

	await page.locator('text=Manually Trigger workflow').click();

	// Click text=Manually Trigger workflow
	// page.once('dialog', (dialog) => {
	// 	expect(dialog.message()).toEqual("")
	// 	dialog.dismiss().catch(() => {
	// 		return;
	// 	});
	// });
});
