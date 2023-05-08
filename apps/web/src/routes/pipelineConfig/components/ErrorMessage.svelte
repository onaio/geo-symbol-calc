<script lang="ts">
	import { get } from 'lodash-es';
	export let name: string;
	export let errors;

	$: error = get($errors, name);
</script>

{#if error}
	<small class="text-danger">{error}</small>
{/if}
