<script lang="ts">
	import type { PageData } from './$types';
	import { convertCronToHuman } from './utils';
	import PageHeader from '$lib/shared/components/PageHeader.svelte';

	export let data: PageData;
</script>

{#if data.configs.length === 0}
	<main>
		<PageHeader pageTitle="Pipeline list" />
		<div class="card">
			<div class="card-body">
				<span class="text-danger">No Pipeline configurations were detected.</span>
			</div>
		</div>
	</main>
{:else}
	<main>
		<PageHeader pageTitle="Pipeline list" />

		<table class="table">
			<thead>
				<tr>
					<th>Title</th>
					<th>BaseUrl</th>
					<th>facility Reg Form Id</th>
					<th>Visit Form Id</th>
					<th>Schedule</th>
				</tr>
			</thead>
			<tbody>
				{#each data.configs as config, idex}
					<tr>
						<td>
							<a href={`/workflows/reports/${config.uuid}`}>
								{config.title}
							</a>
						</td>
						<td>{config.baseUrl}</td>
						<td>{config.regFormId}</td>
						<td>{config.visitFormId}</td>
						<td>{convertCronToHuman(config.schedule)}</td>
					</tr>
				{/each}
				<tr />
			</tbody>
		</table>
	</main>
{/if}
