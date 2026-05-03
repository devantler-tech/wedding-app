export interface GalleryEntry {
	src: string;
	alt: string;
	caption: string;
	date: string;
}

export const galleryEntries: GalleryEntry[] = [
	{
		src: '/gallery/placeholder-1.jpg',
		alt: 'Vores første møde',
		caption: 'Hvor det hele begyndte',
		date: '2020'
	},
	{
		src: '/gallery/placeholder-2.jpg',
		alt: 'Vores første ferie',
		caption: 'Eventyr sammen',
		date: '2021'
	},
	{
		src: '/gallery/placeholder-3.jpg',
		alt: 'En særlig dag',
		caption: 'Et øjeblik vi aldrig glemmer',
		date: '2022'
	},
	{
		src: '/gallery/placeholder-4.jpg',
		alt: 'Forlovelsen',
		caption: 'Hun sagde ja!',
		date: '2023'
	},
	{
		src: '/gallery/placeholder-5.jpg',
		alt: 'Sammen i hverdagen',
		caption: 'De små øjeblikke',
		date: '2024'
	},
	{
		src: '/gallery/placeholder-6.jpg',
		alt: 'Bryllupsforberedelser',
		caption: 'Snart skal vi giftes',
		date: '2025'
	}
];
