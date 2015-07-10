<!DOCTYPE html>

<html class="core">
	<head>
		<meta charset="utf-8">
		<meta content="IE=edge,chrome=1" http-equiv="X-UA-Compatible">

		<title>Sapi Capi Mapi</title>
		<meta name="viewport" content="width=device-width, initial-scale=1">

		<script>
			/* global document, window */
			var cutsTheMustard = ('querySelector' in document && 'localStorage' in window && 'addEventListener' in window);
			if (cutsTheMustard) {
				document.documentElement.className = document.documentElement.className.replace(/\bcore\b/g, 'enhanced');
			}
		</script>

		<link href="//build.origami.ft.com/bundles/css?modules=o-fonts@^1.6.7,o-ft-icons@^2.3.6,o-techdocs,o-grid,o-forms,o-buttons" rel="stylesheet">
		<link href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/4.2.0/css/font-awesome.css" rel="stylesheet">

		<!-- build:css styles/main.css -->
		<link rel="stylesheet" href="styles/main.css">
		<!-- endbuild -->

		<link rel="shortcut icon" href="/favicon.ico">

	</head>
	<body class='o-techdocs'>
		<header class="o-header" data-o-component="o-header">
			<div class="o-header__container">
				<div class="o-header__inner">
					<div class="o-header__primary">
						<div class="o-header__primary__left">
							<a class="o-header__logo o-header__logo--ft" href="http://www.ft.com">
								<abbr title="Financial Times">FT</abbr>
								<h1 class="o-header__title">Slurpage - Sappy</h1></a>
						</div>
						<div class="o-header__primary__right">People Network</div>
					</div>
				</div>
			</div>
		</header>

		<div class="o-techdocs-layout">
			<div class="o-techdocs-main o-techdocs-main--fullwidth o-techdocs-content">
				<a href="/index.html">Erdos Maps</a><br />
				<a href="/erdos.html">Erdos Paths</a>
			</div>
		</div>
	</body>
</html>
