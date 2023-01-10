<script lang="ts">
	import type { PageData } from './$types';
	import { range } from 'lodash-es';
	import { convertCronToHuman, formatTimestamp, parseForTable } from './utils';
	import PageHeader from '$lib/shared/components/PageHeader.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { toast } from '@zerodevx/svelte-toast';
	import { isPipelineRunning } from '$lib/shared/utils';

	export let data: PageData;

	// callback for manual trigger user action.
	const manualTrigger = async (uuid: string) => {
		const sParams = new URLSearchParams({
			uuid
		});
		const fullUrl = `/workflows/run?${sParams.toString()}`;
		return await fetch(fullUrl)
			.then((res) => {
				res.json().then((body) => {
					toast.push(body.message);
				});
			})
			.catch((err) => {
				toast.push(err.message);
			});
	};

	// callback for edit trigger user action.
	const editTrigger = async (uuid: string) => {
		const sParams = new URLSearchParams({
			uuid
		});
		const fullUrl = `/configs?${sParams.toString()}`;
		goto(fullUrl);
	};

	// callback for delete trigger user action.
	const deleteTrigger = async (uuid: string) => {
		const sParams = new URLSearchParams({
			uuid
		});
		const fullUrl = `/configs?${sParams.toString()}`;
		return await fetch(fullUrl, {
			method: 'DELETE'
		})
			.then(() => {
				toast.push('Config deleted.');
			})
			.catch((err) => {
				toast.push(err.message);
			})
			.finally(() => {
				window.location.reload();
			});
	};
</script>

<!-- <svelte:head>
	<meta http-equiv="refresh" content="5" />
</svelte:head> -->

{#if data.configs.length === 0}
	<main>
		<PageHeader pageTitle="Configured Pipeline list" />
		<div class="card">
			<div class="card-body">
				<span class="text-danger">No Pipeline configurations were detected.</span>
			</div>
		</div>
	</main>
{:else}
	<main>
		<PageHeader pageTitle="Configured Pipeline list" />
		{#each data.configs as config, idex}
			{@const { tableHeaders, tableRows, colorsColSpan } = parseForTable(config)}
			{@const metric = config.metric}
			{@const pipelineIsRunning = isPipelineRunning(metric)}
			<div class="card my-3">
				<div class="card-header d-flex justify-content-end gap-2">
					<button
						on:click={() => manualTrigger(config.uuid)}
						disabled={pipelineIsRunning}
						class="btn btn-outline-primary btn-sm"
						><i class="fas fa-cogs" /> Manually Trigger workflow</button
					>
					<button on:click={() => editTrigger(config.uuid)} class="btn btn-outline-primary btn-sm"
						><i class="fas fa-edit" /> Edit</button
					>
					<button on:click={() => deleteTrigger(config.uuid)} class="btn btn-outline-danger btn-sm">
						<i class="fas fa-trash" /> Delete
					</button>
				</div>
				<div class="card-body">
					<dl class="row">
						<dt class="col-sm-3">API Base url</dt>
						<dd class="col-sm-9">{config.baseUrl}</dd>
						<dt class="col-sm-3">Registration form Id</dt>
						<dd class="col-sm-9">{config.formPair.regFormId}</dd>
						<dt class="col-sm-3">Visit form Id</dt>
						<dd class="col-sm-9">{config.formPair.visitFormId}</dd>
					</dl>
					<div class="text-center">
						<table class="table table-bordered table-sm table-hover text-center">
							<thead>
								<tr>
									{#each tableHeaders as header, i}
										{#if i === tableHeaders.length - 1}
											<th scope="col" colspan={colorsColSpan}>{header}</th>
										{:else}
											<th scope="col">{header}</th>
										{/if}
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each tableRows as row}
									<tr>
										{#each range(colorsColSpan + (tableHeaders.length - 1)) as idx}
											{@const thisElement = row[idx]}
											{#if thisElement === undefined}
												<td />
											{:else if Array.isArray(thisElement)}
												<td style={`background-color: ${thisElement[1]}`}
													><span class="fw-bolder">{thisElement[0]}</span></td
												>
											{:else}
												<td>{thisElement}</td>
											{/if}
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
						<span class="card-text d-inline-block me-2 text-muted">Schedule:</span><span
							class="card-text">{convertCronToHuman(config.schedule)}</span
						>
					</div>
					<hr />
					<div class="accordion" id={`metrics-${idex}`}>
						<div class="accordion-item">
							<h2 class="accordion-header" id={`heading-${idex}`}>
								<button
									class="accordion-button"
									type="button"
									data-bs-toggle="collapse"
									data-bs-target={`#collapse-${idex}`}
									aria-expanded="true"
									aria-controls={`collapse-${idex}`}
								>
									Metrics for the last run
								</button>
							</h2>
							<div
								id={`collapse-${idex}`}
								class="accordion-collapse collapse"
								aria-labelledby={`heading-${idex}`}
								data-bs-parent={`#metrics-${idex}`}
							>
								<div class="accordion-body">
									{#if metric === undefined}
										<div class="card">
											<div class="card-body">
												<span class="text-danger"
													>No previous run information was found for this Pipeline.</span
												>
											</div>
										</div>
									{:else}
										{#if pipelineIsRunning}
											<span class="text-info">Pipeline is currently running.</span>
										{/if}
										<dl class="row">
											<dt class="col-sm-9">Started</dt>
											<dd class="col-sm-3">
												{metric?.startTime ? formatTimestamp(metric?.startTime) : ' - '}
											</dd>
											<dt class="col-sm-9">Ended</dt>
											<dd class="col-sm-3">
												{metric?.endTime ? formatTimestamp(metric?.endTime) : ' - '}
											</dd>
											<dt class="col-sm-9">No. of registration submissions evaluated</dt>
											<dd class="col-sm-3">{metric?.evaluated}</dd>
											<dt class="col-sm-9">No. of registration submissions modified</dt>
											<dd class="col-sm-3">{metric?.modified}</dd>
											<dt class="col-sm-9">
												No. of registration submissions not modified due to error
											</dt>
											<dd class="col-sm-3">{metric?.notModdifiedDueError}</dd>
										</dl>
									{/if}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</main>
{/if}
